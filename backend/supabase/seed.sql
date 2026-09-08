-- Run after the main Warden seed and the telephone migration.
-- Demo PINs are synthetic and must be replaced outside the hackathon fixture.
INSERT INTO staff_voice_credentials (staff_id, pin_hash)
SELECT id, crypt('2468', gen_salt('bf')) FROM staff WHERE employee_number = 'EMP-101'
ON CONFLICT (staff_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW();

INSERT INTO staff_voice_credentials (staff_id, pin_hash)
SELECT id, crypt('1111', gen_salt('bf')) FROM staff WHERE employee_number = 'EMP-301'
ON CONFLICT (staff_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW();

INSERT INTO bed_transport_readiness (bed_id, ready)
SELECT id, TRUE FROM beds WHERE bed_number IN ('Bed 8', 'Bed 12', 'Bed 17', 'Bed 18')
ON CONFLICT (bed_id) DO UPDATE SET ready = EXCLUDED.ready, updated_at = NOW();
