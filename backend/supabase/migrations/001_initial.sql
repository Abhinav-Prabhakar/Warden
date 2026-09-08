-- Telephone coordination additions for the existing Warden schema.
-- Apply after ../supabase/migrations/20260906000001_initial_warden_schema.sql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS staff_voice_credentials (
  staff_id UUID PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bed_transport_readiness (
  bed_id UUID PRIMARY KEY REFERENCES beds(id) ON DELETE CASCADE,
  ready BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  bed_id UUID NOT NULL REFERENCES beds(id),
  ward_id UUID NOT NULL REFERENCES wards(id),
  origin_zone TEXT NOT NULL,
  destination TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('routine', 'urgent')),
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('wheelchair', 'stretcher')),
  requested_by UUID NOT NULL REFERENCES staff(id),
  assigned_staff_id UUID REFERENCES staff(id),
  dashboard_task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','dispatching','assigned','accepted','in_progress','completed',
    'cancellation_requested','cancelled','failed'
  )),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_transport_per_bed
  ON transport_tasks(bed_id)
  WHERE status IN ('requested','dispatching','assigned','accepted','in_progress','cancellation_requested');

CREATE TABLE IF NOT EXISTS dispatch_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES transport_tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),
  attempt_number INTEGER NOT NULL,
  provider_call_id TEXT,
  response TEXT CHECK (response IN ('accepted','rejected','timeout','failed')),
  response_deadline TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE(task_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_call_id TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  remote_phone TEXT NOT NULL,
  verified_staff_id UUID REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'connected',
  provider TEXT NOT NULL DEFAULT 'livekit',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS operation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES transport_tasks(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
  operation_id UUID NOT NULL,
  revision INTEGER NOT NULL,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  provider TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordinator_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES wards(id),
  task_id UUID NOT NULL REFERENCES transport_tasks(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS operation_events_task_time ON operation_events(task_id, created_at);
CREATE INDEX IF NOT EXISTS dispatch_attempts_call ON dispatch_attempts(provider_call_id);

CREATE OR REPLACE FUNCTION verify_staff_pin(p_staff_id UUID, p_pin TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_voice_credentials
    WHERE staff_id = p_staff_id
      AND (locked_until IS NULL OR locked_until < NOW())
      AND pin_hash = crypt(p_pin, pin_hash)
  )
$$;

CREATE OR REPLACE FUNCTION transition_transport_task(
  p_task_id UUID, p_from TEXT[], p_to TEXT, p_actor_id UUID DEFAULT NULL
)
RETURNS transport_tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result transport_tasks;
BEGIN
  UPDATE transport_tasks SET
    status = p_to,
    accepted_at = CASE WHEN p_to = 'accepted' THEN NOW() ELSE accepted_at END,
    completed_at = CASE WHEN p_to = 'completed' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_to = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_task_id AND status = ANY(p_from)
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'invalid or conflicting task transition'; END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION assign_transport_task(p_task_id UUID, p_staff_id UUID)
RETURNS transport_tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result transport_tasks;
BEGIN
  UPDATE transport_tasks SET assigned_staff_id = p_staff_id, status = 'assigned'
  WHERE id = p_task_id AND status = 'dispatching' AND assigned_staff_id IS NULL
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'task already assigned or not dispatching'; END IF;
  RETURN result;
END $$;

ALTER TABLE staff_voice_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_transport_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transport_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE operation_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
