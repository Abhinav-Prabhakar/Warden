-- Warden Comprehensive Seed Data
-- Aligned with Product Specification and Database Schema

DO $$
DECLARE
    hosp_id UUID;
    dept_med UUID;
    dept_rad UUID;
    dept_pharm UUID;
    dept_trans UUID;
    dept_fac UUID;
    ward_4b UUID;

    -- Staff IDs
    staff_priya UUID;
    staff_rahul UUID;
    staff_dr_shah UUID;
    staff_arjun UUID;
    staff_warden UUID;

    -- Auth User IDs
    auth_priya UUID;
    auth_rahul UUID;
    auth_dr_shah UUID;
    auth_arjun UUID;
    auth_warden UUID;

    -- Navigation Nodes
    node_station UUID := gen_random_uuid();
    node_corridor_1 UUID := gen_random_uuid();
    node_corridor_2 UUID := gen_random_uuid();
    node_pharmacy UUID := gen_random_uuid();
    node_radiology UUID := gen_random_uuid();
    node_elevator UUID := gen_random_uuid();
    node_room_401 UUID := gen_random_uuid();
    node_room_402 UUID := gen_random_uuid();
    node_room_403 UUID := gen_random_uuid();
    node_room_404 UUID := gen_random_uuid();
    node_room_405 UUID := gen_random_uuid();
    node_room_406 UUID := gen_random_uuid();

    -- Rooms
    room_401 UUID := gen_random_uuid();
    room_402 UUID := gen_random_uuid();
    room_403 UUID := gen_random_uuid();
    room_404 UUID := gen_random_uuid();
    room_405 UUID := gen_random_uuid();
    room_406 UUID := gen_random_uuid();

    -- Beds
    bed_8 UUID := gen_random_uuid();
    bed_12 UUID := gen_random_uuid();
    bed_14 UUID := gen_random_uuid();
    bed_17 UUID := gen_random_uuid();
    bed_18 UUID := gen_random_uuid();
    bed_22 UUID := gen_random_uuid();
    bed_1 UUID := gen_random_uuid();
    bed_2 UUID := gen_random_uuid();
    bed_3 UUID := gen_random_uuid();
    bed_4 UUID := gen_random_uuid();

    -- Patients
    patient_8 UUID := gen_random_uuid();
    patient_12 UUID := gen_random_uuid();
    patient_14 UUID := gen_random_uuid();
    patient_17 UUID := gen_random_uuid();
    patient_18 UUID := gen_random_uuid();

    -- Tasks
    task_bed8_imaging UUID := gen_random_uuid();
    task_bed8_doctor UUID := gen_random_uuid();
    task_bed12_o2 UUID := gen_random_uuid();
    task_bed14_doc_sign UUID := gen_random_uuid();
    task_bed14_pharm UUID := gen_random_uuid();
    task_bed14_print UUID := gen_random_uuid();
    task_bed14_trans UUID := gen_random_uuid();
    task_bed14_clean UUID := gen_random_uuid();
    task_bed17_print UUID := gen_random_uuid();
    task_gloves_restock UUID := gen_random_uuid();

    -- Printers
    printer_ward UUID := gen_random_uuid();
    printer_rad UUID := gen_random_uuid();

    -- Transport
    trans_chair_1 UUID := gen_random_uuid();
    trans_chair_2 UUID := gen_random_uuid();

    -- Equipment
    res_o2_type UUID := gen_random_uuid();
    res_pump_type UUID := gen_random_uuid();
    res_o2_1 UUID := gen_random_uuid();
    res_o2_2 UUID := gen_random_uuid();
    res_pump_1 UUID := gen_random_uuid();

    -- Contacts
    contact_rao UUID := gen_random_uuid();
    contact_gupta UUID := gen_random_uuid();

    -- Meds
    med_ceftriaxone UUID := gen_random_uuid();
    med_paracetamol UUID := gen_random_uuid();
    med_salbutamol UUID := gen_random_uuid();

    pat_med_8 UUID := gen_random_uuid();
    pat_med_12 UUID := gen_random_uuid();
BEGIN
    -- 1. Create / Retrieve Hospital
    INSERT INTO hospitals (name, code, timezone, address, phone)
    VALUES ('St. Jude Metropolitan Hospital', 'SJM-01', 'Asia/Kolkata', '{"city":"Hyderabad","country":"India"}'::jsonb, '+91-40-23456789')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO hosp_id;

    -- 2. Departments
    INSERT INTO departments (hospital_id, name, code, department_type, floor_number, phone)
    VALUES
        (hosp_id, 'Inpatient Medicine', 'MED-4', 'general', 4, '4001'),
        (hosp_id, 'Radiology & Imaging', 'RAD-1', 'radiology', 1, '1005'),
        (hosp_id, 'Central Pharmacy', 'PHARM-1', 'pharmacy', 1, '1008'),
        (hosp_id, 'Patient Transport', 'TRANS-0', 'transport', 1, '1002'),
        (hosp_id, 'Facilities & Housekeeping', 'FAC-0', 'facility', 1, '1004')
    ;

    SELECT id INTO dept_med FROM departments WHERE code = 'MED-4' AND hospital_id = hosp_id LIMIT 1;
    SELECT id INTO dept_rad FROM departments WHERE code = 'RAD-1' AND hospital_id = hosp_id LIMIT 1;
    SELECT id INTO dept_pharm FROM departments WHERE code = 'PHARM-1' AND hospital_id = hosp_id LIMIT 1;
    SELECT id INTO dept_trans FROM departments WHERE code = 'TRANS-0' AND hospital_id = hosp_id LIMIT 1;
    SELECT id INTO dept_fac FROM departments WHERE code = 'FAC-0' AND hospital_id = hosp_id LIMIT 1;

    -- 3. Wards
    INSERT INTO wards (hospital_id, department_id, name, code, floor_number, ward_type, capacity)
    VALUES (hosp_id, dept_med, 'Ward 4B - Acute Adult Care', 'W-4B', 4, 'acute_care', 24)
    RETURNING id INTO ward_4b;

    -- 4. Rooms
    INSERT INTO rooms (id, ward_id, department_id, room_number, room_type, floor_number, isolation_capable, capacity)
    VALUES
        (room_401, ward_4b, dept_med, '401', 'double', 4, false, 4),
        (room_402, ward_4b, dept_med, '402', 'double', 4, false, 4),
        (room_403, ward_4b, dept_med, '403', 'isolation', 4, true, 4),
        (room_404, ward_4b, dept_med, '404', 'standard', 4, false, 4),
        (room_405, ward_4b, dept_med, '405', 'standard', 4, false, 4),
        (room_406, ward_4b, dept_med, '406', 'step_down', 4, false, 4)
    ON CONFLICT (id) DO NOTHING;

    -- 5. Navigation Nodes
    INSERT INTO navigation_nodes (id, hospital_id, floor_number, node_type, x, y, room_id, name)
    VALUES
        (node_station, hosp_id, 4, 'junction', 50.0, 50.0, NULL, 'Ward 4B Central Nurse Station'),
        (node_corridor_1, hosp_id, 4, 'corridor', 30.0, 50.0, NULL, 'Corridor West Wing'),
        (node_corridor_2, hosp_id, 4, 'corridor', 70.0, 50.0, NULL, 'Corridor East Wing'),
        (node_elevator, hosp_id, 4, 'elevator', 50.0, 20.0, NULL, 'Main Service Elevator Bank 4'),
        (node_room_401, hosp_id, 4, 'room', 20.0, 40.0, room_401, 'Room 401 Entry'),
        (node_room_402, hosp_id, 4, 'room', 20.0, 60.0, room_402, 'Room 402 Entry'),
        (node_room_403, hosp_id, 4, 'room', 40.0, 70.0, room_403, 'Room 403 Entry'),
        (node_room_404, hosp_id, 4, 'room', 60.0, 70.0, room_404, 'Room 404 Entry'),
        (node_room_405, hosp_id, 4, 'room', 80.0, 60.0, room_405, 'Room 405 Entry'),
        (node_room_406, hosp_id, 4, 'room', 80.0, 40.0, room_406, 'Room 406 Entry'),
        (node_pharmacy, hosp_id, 1, 'department', 10.0, 10.0, NULL, 'Pharmacy Dispensing Window'),
        (node_radiology, hosp_id, 1, 'department', 90.0, 10.0, NULL, 'Radiology CT Suite 1')
    ON CONFLICT (id) DO NOTHING;

    -- Navigation Edges
    INSERT INTO navigation_edges (from_node_id, to_node_id, distance_meters, estimated_seconds, accessible)
    VALUES
        (node_station, node_corridor_1, 20, 15, true),
        (node_station, node_corridor_2, 20, 15, true),
        (node_station, node_elevator, 30, 25, true),
        (node_corridor_1, node_room_401, 10, 8, true),
        (node_corridor_1, node_room_402, 10, 8, true),
        (node_corridor_1, node_room_403, 15, 10, true),
        (node_corridor_2, node_room_404, 15, 10, true),
        (node_corridor_2, node_room_405, 10, 8, true),
        (node_corridor_2, node_room_406, 10, 8, true),
        (node_elevator, node_pharmacy, 120, 90, true),
        (node_elevator, node_radiology, 140, 110, true);

    -- 6. Auth Users
    SELECT id INTO auth_priya FROM auth.users WHERE email = 'nurse.priya@warden.hospital' LIMIT 1;
    IF auth_priya IS NULL THEN
        auth_priya := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (auth_priya, '00000000-0000-0000-0000-000000000000', 'nurse.priya@warden.hospital', crypt('WardenStaff2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Nurse Priya Sharma","role":"nurse"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;

    SELECT id INTO auth_rahul FROM auth.users WHERE email = 'rahul.nurse@warden.hospital' LIMIT 1;
    IF auth_rahul IS NULL THEN
        auth_rahul := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (auth_rahul, '00000000-0000-0000-0000-000000000000', 'rahul.nurse@warden.hospital', crypt('WardenStaff2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Rahul Verma","role":"nurse"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;

    SELECT id INTO auth_dr_shah FROM auth.users WHERE email = 'dr.shah@warden.hospital' LIMIT 1;
    IF auth_dr_shah IS NULL THEN
        auth_dr_shah := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (auth_dr_shah, '00000000-0000-0000-0000-000000000000', 'dr.shah@warden.hospital', crypt('WardenStaff2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Dr. Alok Shah","role":"doctor"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;

    SELECT id INTO auth_arjun FROM auth.users WHERE email = 'arjun.porter@warden.hospital' LIMIT 1;
    IF auth_arjun IS NULL THEN
        auth_arjun := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (auth_arjun, '00000000-0000-0000-0000-000000000000', 'arjun.porter@warden.hospital', crypt('WardenStaff2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Arjun Patel","role":"porter"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;

    SELECT id INTO auth_warden FROM auth.users WHERE email = 'warden.coordinator@warden.hospital' LIMIT 1;
    IF auth_warden IS NULL THEN
        auth_warden := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (auth_warden, '00000000-0000-0000-0000-000000000000', 'warden.coordinator@warden.hospital', crypt('WardenStaff2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Sunita Rao (Night Coordinator)","role":"warden"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;

    -- 7. Staff Records
    INSERT INTO staff (auth_user_id, hospital_id, employee_number, first_name, last_name, display_name, role, department_id, phone, email, status, is_on_duty)
    VALUES
        (auth_priya, hosp_id, 'EMP-101', 'Priya', 'Sharma', 'Nurse Priya', 'nurse', dept_med, '+91-9876543210', 'nurse.priya@warden.hospital', 'busy', true),
        (auth_rahul, hosp_id, 'EMP-102', 'Rahul', 'Verma', 'Nurse Rahul', 'nurse', dept_med, '+91-9876543211', 'rahul.nurse@warden.hospital', 'active', true),
        (auth_dr_shah, hosp_id, 'EMP-201', 'Alok', 'Shah', 'Dr. Shah', 'doctor', dept_med, '+91-9876543212', 'dr.shah@warden.hospital', 'active', true),
        (auth_arjun, hosp_id, 'EMP-301', 'Arjun', 'Patel', 'Porter Arjun', 'porter', dept_trans, '+91-9876543213', 'arjun.porter@warden.hospital', 'active', true),
        (auth_warden, hosp_id, 'EMP-401', 'Sunita', 'Rao', 'Coordinator Sunita', 'warden', dept_med, '+91-9876543214', 'warden.coordinator@warden.hospital', 'active', true)
    ON CONFLICT (employee_number) DO UPDATE SET is_on_duty = EXCLUDED.is_on_duty;

    SELECT id INTO staff_priya FROM staff WHERE employee_number = 'EMP-101';
    SELECT id INTO staff_rahul FROM staff WHERE employee_number = 'EMP-102';
    SELECT id INTO staff_dr_shah FROM staff WHERE employee_number = 'EMP-201';
    SELECT id INTO staff_arjun FROM staff WHERE employee_number = 'EMP-301';
    SELECT id INTO staff_warden FROM staff WHERE employee_number = 'EMP-401';

    -- Staff Current Locations
    INSERT INTO staff_current_locations (staff_id, navigation_node_id)
    VALUES
        (staff_priya, node_room_402),
        (staff_rahul, node_station),
        (staff_dr_shah, node_corridor_1),
        (staff_arjun, node_elevator),
        (staff_warden, node_station)
    ON CONFLICT (staff_id) DO UPDATE SET navigation_node_id = EXCLUDED.navigation_node_id;

    -- Staff Shifts (Night Shift: 20:00 to 08:00)
    INSERT INTO staff_shifts (staff_id, ward_id, department_id, shift_start, shift_end, status)
    VALUES
        (staff_priya, ward_4b, dept_med, NOW() - interval '4 hours', NOW() + interval '8 hours', 'active'),
        (staff_rahul, ward_4b, dept_med, NOW() - interval '4 hours', NOW() + interval '8 hours', 'active'),
        (staff_dr_shah, ward_4b, dept_med, NOW() - interval '4 hours', NOW() + interval '8 hours', 'active'),
        (staff_arjun, ward_4b, dept_trans, NOW() - interval '4 hours', NOW() + interval '8 hours', 'active'),
        (staff_warden, ward_4b, dept_med, NOW() - interval '4 hours', NOW() + interval '8 hours', 'active');

    -- Staff Skills
    INSERT INTO staff_skills (staff_id, skill_code, proficiency, certified)
    VALUES
        (staff_priya, 'icu', 'expert', true),
        (staff_priya, 'medication', 'expert', true),
        (staff_priya, 'ventilator', 'competent', true),
        (staff_rahul, 'medication', 'competent', true),
        (staff_rahul, 'phlebotomy', 'expert', true),
        (staff_rahul, 'emergency_response', 'competent', true),
        (staff_dr_shah, 'cardiology', 'specialist', true),
        (staff_dr_shah, 'icu', 'specialist', true),
        (staff_arjun, 'transport', 'expert', true),
        (staff_arjun, 'stretcher', 'expert', true);

    -- 8. Patients
    INSERT INTO patients (id, hospital_id, medical_record_number, first_name, last_name, date_of_birth, sex, blood_type, acuity, status)
    VALUES
        (patient_8, hosp_id, 'MRN-1008', 'Vikram', 'Malhotra', '1962-04-12', 'M', 'B+', 'urgent', 'admitted'),
        (patient_12, hosp_id, 'MRN-1012', 'Ananya', 'Rao', '1955-09-24', 'F', 'O+', 'needs_attention', 'admitted'),
        (patient_14, hosp_id, 'MRN-1014', 'Ramesh', 'Gupta', '1970-11-03', 'M', 'A+', 'stable', 'admitted'),
        (patient_17, hosp_id, 'MRN-1017', 'Meera', 'Patel', '1988-02-18', 'F', 'AB-', 'stable', 'admitted'),
        (patient_18, hosp_id, 'MRN-1018', 'Kavita', 'Desai', '1979-06-30', 'F', 'O-', 'stable', 'admitted')
    ON CONFLICT (medical_record_number) DO UPDATE SET acuity = EXCLUDED.acuity;

    -- 9. Beds
    INSERT INTO beds (id, room_id, bed_number, bed_type, status, isolation_capable, oxygen_available, monitor_available, current_patient_id)
    VALUES
        (bed_8, room_402, 'Bed 8', 'icu_step_down', 'occupied', false, true, true, patient_8),
        (bed_12, room_403, 'Bed 12', 'standard', 'occupied', true, false, false, patient_12),
        (bed_14, room_404, 'Bed 14', 'standard', 'blocked', false, true, false, patient_14),
        (bed_17, room_405, 'Bed 17', 'standard', 'occupied', false, true, false, patient_17),
        (bed_18, room_405, 'Bed 18', 'standard', 'occupied', false, true, false, patient_18),
        (bed_22, room_406, 'Bed 22', 'standard', 'cleaning', false, true, false, NULL),
        (bed_1, room_401, 'Bed 1', 'standard', 'available', false, true, false, NULL),
        (bed_2, room_401, 'Bed 2', 'standard', 'available', false, true, false, NULL),
        (bed_3, room_401, 'Bed 3', 'standard', 'reserved', false, true, false, NULL),
        (bed_4, room_401, 'Bed 4', 'standard', 'available', false, true, false, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 10. Bed Assignments History
    INSERT INTO bed_assignments (patient_id, bed_id, assigned_at, assigned_by, reason)
    VALUES
        (patient_8, bed_8, NOW() - interval '2 days', staff_warden, 'Admitted for acute chest pain / telemetry'),
        (patient_12, bed_12, NOW() - interval '3 days', staff_warden, 'Admitted for COPD exacerbation'),
        (patient_14, bed_14, NOW() - interval '5 days', staff_warden, 'Post-op knee arthroplasty recovery'),
        (patient_17, bed_17, NOW() - interval '4 days', staff_warden, 'Pneumonia recovery'),
        (patient_18, bed_18, NOW() - interval '1 day', staff_warden, 'Abdominal pain investigation');

    -- 11. Patient Contacts
    INSERT INTO contacts (id, first_name, last_name, phone, email, preferred_language)
    VALUES
        (contact_rao, 'Karthik', 'Rao', '+91-9876500012', 'karthik.rao@example.com', 'English'),
        (contact_gupta, 'Sunil', 'Gupta', '+91-9876500014', 'sunil.gupta@example.com', 'Hindi')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO patient_contacts (patient_id, contact_id, relationship, priority, is_primary, can_receive_updates)
    VALUES
        (patient_12, contact_rao, 'Son', 1, true, true),
        (patient_14, contact_gupta, 'Brother', 1, true, true);

    -- 12. Patient Conditions & Allergies
    INSERT INTO patient_conditions (patient_id, code, name, status, severity)
    VALUES
        (patient_8, 'I20.0', 'Unstable Angina / Deteriorating', 'active', 'severe'),
        (patient_12, 'J44.1', 'COPD with Acute Exacerbation', 'active', 'moderate'),
        (patient_14, 'Z96.651', 'Post Left Knee Replacement', 'active', 'mild'),
        (patient_17, 'J18.9', 'Bacterial Pneumonia - Resolving', 'active', 'mild');

    INSERT INTO patient_allergies (patient_id, allergen, reaction, severity, verified)
    VALUES
        (patient_8, 'Penicillin', 'Anaphylaxis', 'severe', true),
        (patient_12, 'Sulfa Drugs', 'Rash and Hives', 'moderate', true);

    -- 13. Vitals Time-Series
    -- Bed 8: Deteriorating vitals
    INSERT INTO vitals (patient_id, recorded_by, recorded_at, heart_rate, respiratory_rate, spo2, temperature, systolic_bp, diastolic_bp, pain_score)
    VALUES
        (patient_8, staff_priya, NOW() - interval '2 hours', 84, 18, 97, 37.1, 128, 82, 3),
        (patient_8, staff_priya, NOW() - interval '45 minutes', 102, 24, 93, 37.8, 142, 90, 6),
        (patient_8, staff_priya, NOW() - interval '10 minutes', 118, 28, 90, 38.2, 158, 98, 8),
        -- Bed 12: Stable but low SpO2 without O2
        (patient_12, staff_rahul, NOW() - interval '30 minutes', 78, 22, 91, 36.8, 120, 75, 2),
        -- Bed 17: Normal vitals
        (patient_17, staff_rahul, NOW() - interval '1 hour', 72, 16, 99, 36.6, 115, 74, 0);

    -- 14. Medications & Administrations
    INSERT INTO medications (id, name, generic_name, strength, form)
    VALUES
        (med_ceftriaxone, 'Rocephin', 'Ceftriaxone', '1g', 'IV Injection'),
        (med_paracetamol, 'Dolo 650', 'Paracetamol', '650mg', 'Oral Tablet'),
        (med_salbutamol, 'Ventolin', 'Salbutamol', '2.5mg/3ml', 'Nebulizer Solution')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO patient_medications (id, patient_id, medication_id, dose, route, frequency, scheduled_at, prescribed_by)
    VALUES
        (pat_med_8, patient_8, med_ceftriaxone, '1g IV STAT', 'IV', 'Q12H', NOW() - interval '45 minutes', staff_dr_shah),
        (pat_med_12, patient_12, med_salbutamol, '2.5mg Neb', 'Inhalation', 'Q4H PRN', NOW() - interval '15 minutes', staff_dr_shah);

    INSERT INTO medication_administrations (patient_medication_id, administered_by, scheduled_at, status, notes)
    VALUES
        (pat_med_8, NULL, NOW() - interval '45 minutes', 'overdue', 'Medication delayed due to IV line replacement'),
        (pat_med_12, NULL, NOW() - interval '15 minutes', 'scheduled', 'Pending oxygen cylinder delivery for nebulization');

    -- 15. Discharge Plans
    -- Bed 17: Medically cleared, paperwork printing
    INSERT INTO discharge_plans (patient_id, planned_discharge_at, medically_cleared_at, cleared_by, medications_ready, paperwork_complete, family_notified, transport_arranged, belongings_ready, status)
    VALUES
        (patient_17, NOW() + interval '2 hours', NOW() - interval '1 hour', staff_dr_shah, true, true, true, true, true, 'ready');

    -- Bed 14: Blocked discharge
    INSERT INTO discharge_plans (patient_id, planned_discharge_at, medically_cleared_at, cleared_by, medications_ready, paperwork_complete, family_notified, transport_arranged, belongings_ready, status, notes)
    VALUES
        (patient_14, NOW() + interval '4 hours', NULL, NULL, false, false, true, false, false, 'delayed', 'Awaiting attending Dr Shah signature and discharge medications from pharmacy');

    -- 16. Cloud Printers
    INSERT INTO printers (id, hospital_id, department_id, name, location_node_id, printer_type, status, supports_color, supports_duplex)
    VALUES
        (printer_ward, hosp_id, dept_med, 'Ward 4B Central Laser', node_station, 'laser', 'online', false, true),
        (printer_rad, hosp_id, dept_rad, 'Radiology Station Deskjet', node_radiology, 'deskjet', 'online', true, false)
    ON CONFLICT (id) DO NOTHING;

    -- Print Jobs
    INSERT INTO print_jobs (id, printer_id, requested_by, patient_id, document_type, document_title, status, priority, queued_at)
    VALUES
        (gen_random_uuid(), printer_ward, staff_priya, patient_17, 'discharge_summary', 'Discharge Summary & Prescription - Meera Patel (Bed 17)', 'printing', 1, NOW() - interval '5 minutes'),
        (gen_random_uuid(), printer_ward, staff_warden, patient_14, 'discharge_summary', 'Discharge Packet - Ramesh Gupta (Bed 14)', 'queued', 3, NOW() - interval '2 minutes');

    -- 17. Equipment & Inventory
    INSERT INTO resource_types (id, name, category, description)
    VALUES
        (res_o2_type, 'Portable Oxygen Cylinder', 'respiratory', 'Type E Medical O2 Cylinder with flowmeter'),
        (res_pump_type, 'Infusion Pump', 'infusion', 'Alaris Smart Pump')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO resources (id, resource_type_id, hospital_id, asset_number, status, location_node_id, department_id)
    VALUES
        (res_o2_1, res_o2_type, hosp_id, 'O2-CYL-401', 'available', node_station, dept_med),
        (res_o2_2, res_o2_type, hosp_id, 'O2-CYL-402', 'in_use', node_room_402, dept_med),
        (res_pump_1, res_pump_type, hosp_id, 'INF-PUMP-104', 'in_use', node_room_402, dept_med)
    ON CONFLICT (asset_number) DO NOTHING;

    -- Inventory items
    INSERT INTO inventory_items (hospital_id, department_id, item_code, name, category, unit, quantity_on_hand, reorder_threshold, reorder_quantity)
    VALUES
        (hosp_id, dept_med, 'GLOVES-M', 'Nitrile Examination Gloves (Medium)', 'consumables', 'box_of_100', 3, 10, 50),
        (hosp_id, dept_med, 'SYRINGE-10', '10ml Disposable Syringes', 'consumables', 'units', 120, 30, 200),
        (hosp_id, dept_med, 'IV-SET-STD', 'Standard IV Infusion Set', 'consumables', 'units', 45, 20, 100);

    -- Transport Resources
    INSERT INTO transport_resources (id, hospital_id, resource_type, identifier, capacity, location_node_id, status)
    VALUES
        (trans_chair_1, hosp_id, 'wheelchair', 'WC-4B-01', 1, node_station, 'available'),
        (trans_chair_2, hosp_id, 'wheelchair', 'WC-4B-02', 1, node_corridor_2, 'in_use')
    ON CONFLICT (id) DO NOTHING;

    -- 18. Tasks & Dependencies (Central Primitive)
    -- Task 1: Bed 8 imaging
    INSERT INTO tasks (id, hospital_id, patient_id, created_by, task_type, title, description, priority, urgency, status, due_at)
    VALUES
        (task_bed8_imaging, hosp_id, patient_8, staff_priya, 'transport', 'Transport Vikram Malhotra (Bed 8) down to CT Imaging', 'Patient deteriorating. STAT CT Angio ordered by Dr Shah.', 1, 'stat', 'assigned', NOW() + interval '20 minutes'),
        (task_bed8_doctor, hosp_id, patient_8, staff_priya, 'doctor_review', 'Urgent physician bedside review for Bed 8', 'HR 118, SpO2 90% on room air, severe chest pain radiating.', 1, 'stat', 'pending', NOW() + interval '10 minutes'),
        (task_bed12_o2, hosp_id, patient_12, staff_warden, 'facility', 'Bring portable oxygen cylinder to Bed 12 (Mrs Rao)', 'SpO2 91%, nebulizer ordered by Dr Shah.', 2, 'urgent', 'pending', NOW() + interval '15 minutes'),
        (task_bed14_doc_sign, hosp_id, patient_14, staff_warden, 'doctor_review', 'Doctor discharge clearance for Bed 14 (Ramesh Gupta)', 'Physical therapy cleared, surgical wound clean, needs final signoff.', 3, 'routine', 'pending', NOW() + interval '1 hour'),
        (task_bed14_pharm, hosp_id, patient_14, staff_warden, 'medication', 'Dispense take-home medications for Bed 14', 'Pharmacy needs to dispense 14-day supply of analgesics.', 3, 'routine', 'blocked', NOW() + interval '2 hours'),
        (task_bed14_print, hosp_id, patient_14, staff_warden, 'printing', 'Print Bed 14 discharge paperwork', 'Print discharge instructions and follow-up card.', 3, 'routine', 'blocked', NOW() + interval '2 hours'),
        (task_bed14_trans, hosp_id, patient_14, staff_warden, 'transport', 'Escort patient Bed 14 to main lobby for discharge pickup', 'Family arriving at main entrance.', 4, 'routine', 'blocked', NOW() + interval '3 hours'),
        (task_bed14_clean, hosp_id, NULL, staff_warden, 'cleaning', 'Terminal clean for Bed 14 once released', 'Bed needed for incoming transfer from ED.', 2, 'urgent', 'blocked', NOW() + interval '4 hours'),
        (task_bed17_print, hosp_id, patient_17, staff_priya, 'printing', 'Print Bed 17 discharge paperwork', 'Paperwork submitted to Central Ward Printer.', 2, 'urgent', 'in_progress', NOW() + interval '15 minutes'),
        (task_gloves_restock, hosp_id, NULL, staff_warden, 'inventory', 'Restock Medium Nitrile Gloves at Ward 4B Station', 'Only 3 boxes remaining. Minimum threshold is 10.', 3, 'routine', 'pending', NOW() + interval '2 hours')
    ON CONFLICT (id) DO NOTHING;

    -- Task Assignments
    INSERT INTO task_assignments (task_id, staff_id, assigned_at, accepted_at, assignment_role)
    VALUES
        (task_bed8_imaging, staff_arjun, NOW() - interval '5 minutes', NOW() - interval '3 minutes', 'primary'),
        (task_bed17_print, staff_priya, NOW() - interval '10 minutes', NOW() - interval '8 minutes', 'primary');

    -- Task Dependencies (Dependency Chain for Bed 14)
    -- doc_sign -> pharm -> print -> trans -> clean
    INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
    VALUES
        (task_bed14_pharm, task_bed14_doc_sign, 'finish_to_start'),
        (task_bed14_print, task_bed14_pharm, 'finish_to_start'),
        (task_bed14_trans, task_bed14_print, 'finish_to_start'),
        (task_bed14_clean, task_bed14_trans, 'finish_to_start');

    -- Task Events
    INSERT INTO task_events (task_id, event_type, actor_staff_id, metadata)
    VALUES
        (task_bed8_imaging, 'created', staff_priya, '{"urgency":"stat"}'::jsonb),
        (task_bed8_imaging, 'assigned', staff_priya, '{"assigned_to":"Arjun Patel"}'::jsonb),
        (task_bed8_imaging, 'accepted', staff_arjun, '{"note":"Moving to 402 with wheelchair"}'::jsonb),
        (task_bed17_print, 'created', staff_priya, '{"document":"discharge_summary"}'::jsonb),
        (task_bed17_print, 'started', staff_priya, '{"printer":"Ward 4B Central Laser"}'::jsonb);

    -- 19. Transport Request for Bed 8
    INSERT INTO transport_requests (patient_id, requested_by, pickup_location_id, destination_id, transport_type, priority, status, assigned_resource_id, assigned_staff_id)
    VALUES
        (patient_8, staff_priya, node_room_402, node_radiology, 'wheelchair', 1, 'assigned', trans_chair_1, staff_arjun);

    -- 20. Cleaning Job for Bed 22
    INSERT INTO cleaning_jobs (bed_id, assigned_to, started_at, status, priority)
    VALUES
        (bed_22, NULL, NOW() - interval '15 minutes', 'in_progress', 2);

    -- 21. Escalations & Alerts
    INSERT INTO system_alerts (hospital_id, patient_id, alert_type, severity, title, description, source, triggered_at)
    VALUES
        (hosp_id, patient_8, 'critical_vital', 'critical', 'Patient Deterioration Alert - Bed 8 (Vikram Malhotra)', 'SpO2 dropped to 90%, HR increased to 118 bpm. Patient in pain score 8/10.', 'vitals_monitor', NOW() - interval '10 minutes'),
        (hosp_id, NULL, 'inventory_low', 'medium', 'Low Stock Alert: Nitrile Gloves (Medium)', 'Ward 4B has 3 boxes remaining (threshold: 10). Reorder triggered.', 'inventory_tracker', NOW() - interval '1 hour');

    INSERT INTO escalations (patient_id, task_id, trigger_type, severity, current_level, status)
    VALUES
        (patient_8, task_bed8_doctor, 'vital_deterioration', 'critical', 2, 'active');

    INSERT INTO escalation_steps (escalation_id, level, staff_id, response_deadline, status)
    VALUES
        ((SELECT id FROM escalations WHERE patient_id = patient_8 LIMIT 1), 1, staff_priya, NOW() - interval '20 minutes', 'escalated'),
        ((SELECT id FROM escalations WHERE patient_id = patient_8 LIMIT 1), 2, staff_dr_shah, NOW() + interval '10 minutes', 'pending');

    -- 22. Patient & System Events Timeline
    INSERT INTO patient_events (patient_id, event_type, actor_type, actor_id, timestamp, severity, metadata)
    VALUES
        (patient_8, 'vital_recorded', 'staff', staff_priya, NOW() - interval '10 minutes', 'critical', '{"hr":118,"spo2":90,"bp":"158/98"}'::jsonb),
        (patient_8, 'doctor_notified', 'staff', staff_priya, NOW() - interval '8 minutes', 'high', '{"doctor":"Dr. Alok Shah","method":"voice"}'::jsonb),
        (patient_8, 'transport_requested', 'staff', staff_priya, NOW() - interval '5 minutes', 'high', '{"destination":"CT Imaging"}'::jsonb),
        (patient_17, 'discharge_planned', 'staff', staff_dr_shah, NOW() - interval '1 hour', 'routine', '{"cleared_by":"Dr. Shah"}'::jsonb),
        (patient_17, 'print_job_submitted', 'staff', staff_priya, NOW() - interval '5 minutes', 'routine', '{"printer":"Ward 4B Central Laser"}'::jsonb);

    INSERT INTO system_events (event_type, entity_type, entity_id, timestamp, metadata)
    VALUES
        ('printer_busy', 'printer', printer_ward, NOW() - interval '5 minutes', '{"active_job":"Bed 17 Discharge Summary"}'::jsonb),
        ('inventory_low', 'inventory_item', (SELECT id FROM inventory_items WHERE item_code = 'GLOVES-M' LIMIT 1), NOW() - interval '1 hour', '{"item":"GLOVES-M","qty":3}'::jsonb),
        ('bed_status_changed', 'bed', bed_14, NOW() - interval '3 hours', '{"old_status":"occupied","new_status":"blocked","reason":"discharge_chain"}'::jsonb);

    -- Ensure auth.identities exist for email login
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    SELECT
        gen_random_uuid(),
        u.id,
        jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
        'email',
        u.id::text,
        NOW(),
        NOW(),
        NOW()
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

    UPDATE auth.users
    SET confirmation_token = '', recovery_token = '', email_change = '', email_change_token_new = ''
    WHERE confirmation_token IS NULL OR recovery_token IS NULL OR email_change IS NULL OR email_change_token_new IS NULL;

END $;
