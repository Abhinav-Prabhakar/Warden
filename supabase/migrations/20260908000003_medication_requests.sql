-- Medication Requests canonical table and projection functions

CREATE TABLE IF NOT EXISTS medication_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  requested_by UUID NOT NULL REFERENCES staff(id),
  task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','preparing','ready','delivered','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_medication_requests_patient_active
  ON medication_requests(patient_id, requested_at DESC)
  WHERE status IN ('requested','preparing','ready');

CREATE UNIQUE INDEX IF NOT EXISTS one_active_medication_request
  ON medication_requests(patient_id, medication_id)
  WHERE status IN ('requested','preparing','ready');

CREATE OR REPLACE FUNCTION create_medication_request(
  p_patient_id UUID, p_bed_id UUID, p_medication_id UUID, p_requested_by UUID
)
RETURNS medication_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request medication_requests;
  v_task_id UUID;
  v_hospital_id UUID;
  v_medication_name TEXT;
BEGIN
  -- Serialize duplicate checks for the same patient/medicine pair.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_patient_id::text || ':' || p_medication_id::text, 0));
  SELECT mr.* INTO v_request FROM medication_requests mr
    WHERE patient_id = p_patient_id AND medication_id = p_medication_id
      AND status IN ('requested','preparing','ready')
    ORDER BY requested_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN v_request; END IF;

  SELECT s.hospital_id INTO v_hospital_id FROM staff s WHERE s.id = p_requested_by;
  SELECT m.name INTO v_medication_name FROM medications m WHERE m.id = p_medication_id;
  IF v_hospital_id IS NULL OR v_medication_name IS NULL THEN RAISE EXCEPTION 'Invalid requester or medication'; END IF;

  INSERT INTO tasks(hospital_id, patient_id, created_by, task_type, title, priority, urgency, status, source)
    VALUES(v_hospital_id, p_patient_id, p_requested_by, 'medication', 'Prepare ' || v_medication_name, 2, 'urgent', 'pending', 'ui')
    RETURNING id INTO v_task_id;
  INSERT INTO task_events(task_id, event_type, actor_staff_id, metadata)
    VALUES(v_task_id, 'created', p_requested_by, jsonb_build_object('medication_id', p_medication_id, 'bed_id', p_bed_id));
  INSERT INTO medication_requests(patient_id, bed_id, medication_id, requested_by, task_id)
    VALUES(p_patient_id, p_bed_id, p_medication_id, p_requested_by, v_task_id)
    RETURNING * INTO v_request;
  INSERT INTO patient_events(patient_id, event_type, actor_type, actor_id, source, metadata)
    VALUES(p_patient_id, 'medication_requested', 'staff', p_requested_by, 'ui', jsonb_build_object('request_id', v_request.id, 'medication_id', p_medication_id, 'bed_id', p_bed_id));
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION transition_medication_request(p_request_id UUID, p_to TEXT, p_actor_id UUID DEFAULT NULL)
RETURNS medication_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_request medication_requests;
BEGIN
  SELECT * INTO v_request FROM medication_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Medication request not found'; END IF;
  IF NOT (
    (v_request.status = 'requested' AND p_to IN ('preparing','cancelled')) OR
    (v_request.status = 'preparing' AND p_to IN ('ready','cancelled')) OR
    (v_request.status = 'ready' AND p_to IN ('delivered','cancelled'))
  ) THEN RAISE EXCEPTION 'Invalid medication transition from % to %', v_request.status, p_to; END IF;

  UPDATE medication_requests SET
    status = p_to,
    preparing_at = CASE WHEN p_to = 'preparing' THEN NOW() ELSE preparing_at END,
    ready_at = CASE WHEN p_to = 'ready' THEN NOW() ELSE ready_at END,
    delivered_at = CASE WHEN p_to = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_to = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_request_id RETURNING * INTO v_request;

  IF v_request.task_id IS NOT NULL THEN
    UPDATE tasks SET
      status = CASE p_to WHEN 'preparing' THEN 'in_progress' WHEN 'ready' THEN 'acknowledged' WHEN 'delivered' THEN 'completed' WHEN 'cancelled' THEN 'cancelled' END,
      completed_at = CASE WHEN p_to = 'delivered' THEN NOW() ELSE completed_at END,
      cancelled_at = CASE WHEN p_to = 'cancelled' THEN NOW() ELSE cancelled_at END
    WHERE id = v_request.task_id;
  END IF;
  INSERT INTO patient_events(patient_id, event_type, actor_type, actor_id, source, metadata)
    VALUES(v_request.patient_id, 'medication_' || p_to, 'staff', p_actor_id, 'ui', jsonb_build_object('request_id', v_request.id, 'bed_id', v_request.bed_id));
  RETURN v_request;
END;
$$;

ALTER TABLE medication_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access" ON medication_requests;
CREATE POLICY "Allow authenticated full access" ON medication_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read access" ON medication_requests;
CREATE POLICY "Allow anon read access" ON medication_requests FOR SELECT TO anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE medication_requests;
