-- Telephone coordination additions for the existing Warden schema.
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
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS operation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES transport_tasks(id) ON DELETE CASCADE,
  actor_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification function for spoken PIN
CREATE OR REPLACE FUNCTION verify_staff_pin(p_staff_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cred RECORD;
BEGIN
  SELECT * INTO v_cred FROM staff_voice_credentials WHERE staff_id = p_staff_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until > NOW() THEN
    RETURN FALSE;
  END IF;

  IF v_cred.pin_hash = crypt(p_pin, v_cred.pin_hash) THEN
    UPDATE staff_voice_credentials
    SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE staff_id = p_staff_id;
    RETURN TRUE;
  ELSE
    UPDATE staff_voice_credentials
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
        updated_at = NOW()
    WHERE staff_id = p_staff_id;
    RETURN FALSE;
  END IF;
END;
$$;
