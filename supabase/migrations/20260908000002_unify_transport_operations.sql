-- Make transport_tasks the canonical transport record while keeping the general
-- tasks table as an atomic dashboard projection.

ALTER TABLE operation_events
  ADD COLUMN IF NOT EXISTS call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_id UUID,
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS idx_operation_events_fence
  ON operation_events(operation_id, revision, created_at);

CREATE OR REPLACE FUNCTION create_transport_task_with_projection(
  p_patient_id UUID,
  p_bed_id UUID,
  p_ward_id UUID,
  p_origin_zone TEXT,
  p_destination TEXT,
  p_urgency TEXT,
  p_transport_mode TEXT,
  p_requested_by UUID,
  p_status TEXT,
  p_idempotency_key TEXT
)
RETURNS transport_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transport transport_tasks;
  v_dashboard_task_id UUID;
  v_hospital_id UUID;
BEGIN
  INSERT INTO transport_tasks (
    patient_id, bed_id, ward_id, origin_zone, destination, urgency,
    transport_mode, requested_by, status, idempotency_key
  ) VALUES (
    p_patient_id, p_bed_id, p_ward_id, p_origin_zone, p_destination, p_urgency,
    p_transport_mode, p_requested_by, p_status, p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET idempotency_key = EXCLUDED.idempotency_key
  RETURNING * INTO v_transport;

  IF v_transport.dashboard_task_id IS NULL THEN
    SELECT hospital_id INTO v_hospital_id FROM wards WHERE id = v_transport.ward_id;
    IF v_hospital_id IS NULL THEN RAISE EXCEPTION 'Ward has no hospital'; END IF;

    INSERT INTO tasks (
      hospital_id, patient_id, created_by, task_type, title, description,
      priority, urgency, status, source
    ) VALUES (
      v_hospital_id, v_transport.patient_id, v_transport.requested_by, 'transport',
      'Transport to ' || v_transport.destination,
      'Telephone request from ' || v_transport.origin_zone || ' by Warden',
      CASE WHEN v_transport.urgency = 'urgent' THEN 2 ELSE 3 END,
      v_transport.urgency, 'pending', 'voice'
    ) RETURNING id INTO v_dashboard_task_id;

    UPDATE transport_tasks
      SET dashboard_task_id = v_dashboard_task_id
      WHERE id = v_transport.id
      RETURNING * INTO v_transport;

    INSERT INTO task_events(task_id, event_type, actor_staff_id, metadata)
      VALUES (v_dashboard_task_id, 'created', v_transport.requested_by,
        jsonb_build_object('transport_task_id', v_transport.id));
  END IF;

  RETURN v_transport;
END;
$$;

CREATE OR REPLACE FUNCTION assign_transport_task(p_task_id UUID, p_staff_id UUID)
RETURNS transport_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_transport transport_tasks;
BEGIN
  SELECT * INTO v_transport FROM transport_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transport task not found'; END IF;
  IF v_transport.status <> 'dispatching' THEN RAISE EXCEPTION 'Transport task is %', v_transport.status; END IF;

  UPDATE transport_tasks SET assigned_staff_id = p_staff_id, status = 'assigned'
    WHERE id = p_task_id RETURNING * INTO v_transport;
  IF v_transport.dashboard_task_id IS NOT NULL THEN
    INSERT INTO task_assignments(task_id, staff_id)
      SELECT v_transport.dashboard_task_id, p_staff_id
      WHERE NOT EXISTS (
        SELECT 1 FROM task_assignments WHERE task_id = v_transport.dashboard_task_id AND staff_id = p_staff_id AND declined_at IS NULL
      );
    UPDATE tasks SET status = 'assigned' WHERE id = v_transport.dashboard_task_id;
    INSERT INTO task_events(task_id, event_type, actor_staff_id, metadata)
      VALUES (v_transport.dashboard_task_id, 'assigned', p_staff_id,
        jsonb_build_object('transport_task_id', v_transport.id));
  END IF;
  RETURN v_transport;
END;
$$;

CREATE OR REPLACE FUNCTION transition_transport_task(p_task_id UUID, p_from TEXT[], p_to TEXT, p_actor_id UUID DEFAULT NULL)
RETURNS transport_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transport transport_tasks;
  v_dashboard_status TEXT;
  v_event_type TEXT;
BEGIN
  SELECT * INTO v_transport FROM transport_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transport task not found'; END IF;
  IF NOT (v_transport.status = ANY(p_from)) THEN
    RAISE EXCEPTION 'Invalid transport transition from % to %', v_transport.status, p_to;
  END IF;

  UPDATE transport_tasks SET
    status = p_to,
    accepted_at = CASE WHEN p_to = 'accepted' THEN NOW() ELSE accepted_at END,
    completed_at = CASE WHEN p_to = 'completed' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_to = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_task_id RETURNING * INTO v_transport;

  IF v_transport.dashboard_task_id IS NOT NULL THEN
    v_dashboard_status := CASE
      WHEN p_to = 'accepted' THEN 'acknowledged'
      WHEN p_to IN ('requested', 'dispatching') THEN 'pending'
      WHEN p_to IN ('failed', 'cancellation_requested') THEN 'blocked'
      ELSE p_to
    END;
    UPDATE tasks SET
      status = v_dashboard_status,
      completed_at = CASE WHEN p_to = 'completed' THEN NOW() ELSE completed_at END,
      cancelled_at = CASE WHEN p_to = 'cancelled' THEN NOW() ELSE cancelled_at END
    WHERE id = v_transport.dashboard_task_id;

    IF p_to = 'accepted' THEN
      UPDATE task_assignments SET accepted_at = NOW()
        WHERE task_id = v_transport.dashboard_task_id AND staff_id = v_transport.assigned_staff_id;
    ELSIF p_to = 'completed' THEN
      UPDATE task_assignments SET completed_at = NOW()
        WHERE task_id = v_transport.dashboard_task_id AND staff_id = v_transport.assigned_staff_id;
    END IF;

    v_event_type := CASE
      WHEN p_to = 'accepted' THEN 'accepted'
      WHEN p_to = 'completed' THEN 'completed'
      WHEN p_to = 'cancelled' THEN 'cancelled'
      WHEN p_to = 'failed' THEN 'failed'
      ELSE NULL
    END;
    IF v_event_type IS NOT NULL THEN
      INSERT INTO task_events(task_id, event_type, actor_staff_id, metadata)
        VALUES (v_transport.dashboard_task_id, v_event_type, p_actor_id,
          jsonb_build_object('transport_task_id', v_transport.id, 'transport_status', p_to));
    END IF;
  END IF;
  RETURN v_transport;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE operation_events;
