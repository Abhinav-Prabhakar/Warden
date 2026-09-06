-- Warden Database Schema
-- Authority: Database Schema.md
-- Generated for Supabase / PostgreSQL

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Organizations
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    address JSONB DEFAULT '{}'::jsonb,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_hospitals_updated_at
BEFORE UPDATE ON hospitals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    department_type TEXT NOT NULL,
    floor_number INTEGER DEFAULT 1,
    phone TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    floor_number INTEGER DEFAULT 1,
    ward_type TEXT DEFAULT 'general',
    capacity INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Physical Hospital & Navigation Graph
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    room_type TEXT DEFAULT 'standard',
    floor_number INTEGER DEFAULT 1,
    isolation_capable BOOLEAN DEFAULT FALSE,
    capacity INTEGER DEFAULT 1,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS navigation_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    floor_number INTEGER DEFAULT 1,
    node_type TEXT NOT NULL CHECK (node_type IN ('corridor', 'room', 'elevator', 'stairs', 'entrance', 'department', 'junction')),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    name TEXT
);

CREATE TABLE IF NOT EXISTS navigation_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_node_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    to_node_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    distance_meters NUMERIC NOT NULL DEFAULT 1,
    estimated_seconds INTEGER NOT NULL DEFAULT 1,
    accessible BOOLEAN DEFAULT TRUE,
    blocked BOOLEAN DEFAULT FALSE
);

-- 4. People & Staff
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    employee_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('nurse', 'doctor', 'carer', 'warden', 'porter', 'clerk', 'pharmacist', 'technician', 'facility_staff', 'administrator')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_break', 'off_duty', 'busy', 'unavailable')),
    is_on_duty BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_staff_updated_at
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS staff_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    skill_code TEXT NOT NULL,
    proficiency TEXT DEFAULT 'competent',
    certified BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    navigation_node_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'system',
    accuracy_meters NUMERIC
);

CREATE TABLE IF NOT EXISTS staff_current_locations (
    staff_id UUID PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
    navigation_node_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    medical_record_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    sex TEXT,
    blood_type TEXT,
    admission_at TIMESTAMPTZ DEFAULT NOW(),
    discharge_at TIMESTAMPTZ,
    status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted', 'observation', 'discharged', 'transferred', 'deceased')),
    acuity TEXT DEFAULT 'stable' CHECK (acuity IN ('stable', 'needs_attention', 'urgent', 'critical')),
    language TEXT DEFAULT 'English',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Beds (references patients)
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    bed_type TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked')),
    isolation_capable BOOLEAN DEFAULT FALSE,
    oxygen_available BOOLEAN DEFAULT FALSE,
    ventilator_capable BOOLEAN DEFAULT FALSE,
    monitor_available BOOLEAN DEFAULT FALSE,
    current_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_beds_updated_at
BEFORE UPDATE ON beds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Patient Contacts & Demographics
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    preferred_language TEXT DEFAULT 'English',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    can_receive_updates BOOLEAN DEFAULT TRUE,
    communication_notes TEXT
);

CREATE TABLE IF NOT EXISTS patient_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    severity TEXT DEFAULT 'moderate',
    onset_date DATE,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    reaction TEXT,
    severity TEXT DEFAULT 'mild',
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS patient_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    food_preferences JSONB DEFAULT '{}'::jsonb,
    dietary_restrictions JSONB DEFAULT '[]'::jsonb,
    mobility_notes TEXT,
    communication_preferences JSONB DEFAULT '{}'::jsonb,
    other_preferences JSONB DEFAULT '{}'::jsonb
);

-- 8. Clinical State (Vitals, Medications, Labs, Procedures)
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    heart_rate NUMERIC,
    respiratory_rate NUMERIC,
    spo2 NUMERIC,
    temperature NUMERIC,
    systolic_bp NUMERIC,
    diastolic_bp NUMERIC,
    pain_score NUMERIC,
    weight_kg NUMERIC,
    raw_data JSONB
);

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    generic_name TEXT,
    strength TEXT,
    form TEXT
);

CREATE TABLE IF NOT EXISTS patient_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    dose TEXT NOT NULL,
    route TEXT NOT NULL,
    frequency TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    start_at TIMESTAMPTZ DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'held', 'discontinued', 'completed')),
    prescribed_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medication_administrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_medication_id UUID NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
    administered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'given', 'held', 'refused', 'missed', 'overdue')),
    dose_given TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ordered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    test_code TEXT NOT NULL,
    test_name TEXT NOT NULL,
    priority TEXT DEFAULT 'routine' CHECK (priority IN ('stat', 'urgent', 'routine')),
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'collected', 'processing', 'resulted', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    result_code TEXT NOT NULL,
    result_name TEXT NOT NULL,
    value TEXT NOT NULL,
    numeric_value NUMERIC,
    unit TEXT,
    reference_range TEXT,
    abnormal_flag TEXT,
    resulted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    procedure_code TEXT NOT NULL,
    procedure_name TEXT NOT NULL,
    priority TEXT DEFAULT 'routine',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    notes TEXT
);

-- 9. Bed / Movement
CREATE TABLE IF NOT EXISTS bed_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    reason TEXT
);

CREATE TABLE IF NOT EXISTS cleaning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'assigned', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS discharge_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    planned_discharge_at TIMESTAMPTZ,
    medically_cleared_at TIMESTAMPTZ,
    cleared_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    medications_ready BOOLEAN DEFAULT FALSE,
    paperwork_complete BOOLEAN DEFAULT FALSE,
    family_notified BOOLEAN DEFAULT FALSE,
    transport_arranged BOOLEAN DEFAULT FALSE,
    belongings_ready BOOLEAN DEFAULT FALSE,
    bed_cleaning_requested BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'ready', 'discharged', 'delayed', 'cancelled')),
    notes TEXT
);

-- 10. Tasks, Assignments, Dependencies & Events
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('patient_check', 'medication', 'transport', 'doctor_review', 'lab_collection', 'family_call', 'discharge', 'cleaning', 'maintenance', 'inventory', 'handoff', 'printing', 'facility', 'emergency')),
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('low', 'routine', 'urgent', 'stat')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'acknowledged', 'in_progress', 'blocked', 'completed', 'cancelled', 'overdue')),
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    source TEXT DEFAULT 'voice' CHECK (source IN ('voice', 'ui', 'system', 'external')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    assignment_role TEXT DEFAULT 'primary'
);

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start',
    CONSTRAINT no_self_dependency CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'accepted', 'started', 'paused', 'completed', 'cancelled', 'escalated', 'reassigned', 'failed')),
    actor_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Transport
CREATE TABLE IF NOT EXISTS transport_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('wheelchair', 'stretcher', 'bed', 'porter_team', 'ambulance')),
    identifier TEXT NOT NULL,
    capacity INTEGER DEFAULT 1,
    location_node_id UUID REFERENCES navigation_nodes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'unavailable'))
);

CREATE TABLE IF NOT EXISTS transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    pickup_location_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    destination_id UUID NOT NULL REFERENCES navigation_nodes(id) ON DELETE CASCADE,
    transport_type TEXT DEFAULT 'wheelchair',
    priority INTEGER DEFAULT 3,
    required_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'assigned', 'in_transit', 'completed', 'cancelled')),
    assigned_resource_id UUID REFERENCES transport_resources(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transport_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    location_node_id UUID REFERENCES navigation_nodes(id) ON DELETE SET NULL,
    actor_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS patient_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    from_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    to_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    from_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    requested_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    transport_request_id UUID REFERENCES transport_requests(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'in_progress', 'completed', 'cancelled')),
    reason TEXT
);

-- 12. Equipment & Inventory
CREATE TABLE IF NOT EXISTS resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    requires_tracking BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type_id UUID NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    asset_number TEXT UNIQUE NOT NULL,
    serial_number TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'in_use', 'reserved', 'cleaning', 'maintenance', 'missing', 'broken', 'unavailable')),
    location_node_id UUID REFERENCES navigation_nodes(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    last_maintenance_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
    reorder_threshold NUMERIC NOT NULL DEFAULT 10,
    reorder_quantity NUMERIC NOT NULL DEFAULT 50,
    supplier TEXT
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('received', 'dispensed', 'consumed', 'returned', 'wasted', 'adjusted', 'transferred')),
    quantity NUMERIC NOT NULL,
    performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 13. Facilities & Elevators
CREATE TABLE IF NOT EXISTS facility_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    location_node_id UUID REFERENCES navigation_nodes(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('broken_elevator', 'broken_light', 'water', 'temperature', 'equipment_failure', 'cleaning', 'maintenance', 'security', 'infrastructure')),
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'in_progress', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maintenance_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_request_id UUID NOT NULL REFERENCES facility_requests(id) ON DELETE CASCADE,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS elevators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'fault', 'offline')),
    current_floor INTEGER DEFAULT 1,
    capacity_kg INTEGER DEFAULT 1000,
    accessible BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS elevator_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elevator_id UUID NOT NULL REFERENCES elevators(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_floor INTEGER,
    to_floor INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 14. Communication, Notifications & Escalation
CREATE TABLE IF NOT EXISTS communication_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type TEXT NOT NULL CHECK (contact_type IN ('staff', 'patient_contact', 'department', 'external')),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    patient_contact_id UUID REFERENCES patient_contacts(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    preferred_channel TEXT DEFAULT 'voice' CHECK (preferred_channel IN ('voice', 'sms', 'push', 'email')),
    available_from TIME,
    available_until TIME,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS communication_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES communication_contacts(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    purpose TEXT NOT NULL,
    urgency TEXT DEFAULT 'routine',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    outcome TEXT CHECK (outcome IN ('answered', 'busy', 'no_answer', 'voicemail', 'failed')),
    summary TEXT
);

CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL,
    severity TEXT DEFAULT 'moderate' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    current_level INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS escalation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    contact_attempt_id UUID REFERENCES communication_attempts(id) ON DELETE SET NULL,
    response_deadline TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'missed', 'escalated'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    recipient_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 15. Queues & Automation (Explicit First-Class)
CREATE TABLE IF NOT EXISTS dispatch_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 3,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    available_after TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'evaluating', 'dispatched', 'failed', 'cancelled')),
    candidate_staff_ids UUID[],
    selected_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    location_node_id UUID REFERENCES navigation_nodes(id) ON DELETE SET NULL,
    printer_type TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'paper_jam', 'out_of_paper', 'low_toner', 'busy')),
    supports_color BOOLEAN DEFAULT FALSE,
    supports_duplex BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    document_title TEXT NOT NULL,
    storage_path TEXT,
    copies INTEGER DEFAULT 1,
    duplex BOOLEAN DEFAULT TRUE,
    color BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'printing', 'completed', 'failed', 'cancelled', 'retrying')),
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    attempt_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'voice', 'internal')),
    priority INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS automation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    attempt_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- 16. Event Streams, Audit & Warden Memory
CREATE TABLE IF NOT EXISTS patient_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_type TEXT DEFAULT 'staff',
    actor_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT,
    source TEXT DEFAULT 'system',
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_type TEXT DEFAULT 'system',
    actor_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS warden_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    device_id TEXT,
    context JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS warden_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES warden_sessions(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    user_command TEXT NOT NULL,
    interpreted_intent JSONB DEFAULT '{}'::jsonb,
    decision_reason TEXT,
    proposed_action JSONB DEFAULT '{}'::jsonb,
    confirmation_required BOOLEAN DEFAULT FALSE,
    confirmed BOOLEAN,
    executed BOOLEAN DEFAULT FALSE,
    execution_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS voice_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES warden_sessions(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    transcript TEXT NOT NULL,
    intent JSONB DEFAULT '{}'::jsonb,
    entities JSONB DEFAULT '{}'::jsonb,
    confidence NUMERIC DEFAULT 1.0,
    interrupted BOOLEAN DEFAULT FALSE,
    interruption_reason TEXT
);

CREATE TABLE IF NOT EXISTS feedback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_request_id UUID NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    responses JSONB DEFAULT '{}'::jsonb,
    free_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
    attempt_count INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    outcome TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT DEFAULT 'system',
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 17. Indexes (Authoritative as defined in Section 44)
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(medical_record_number);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_status ON patients(hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_beds_current_patient ON beds(current_patient_id);
CREATE INDEX IF NOT EXISTS idx_beds_room ON beds(room_id);

CREATE INDEX IF NOT EXISTS idx_staff_hospital_duty ON staff(hospital_id, is_on_duty);
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff ON staff_current_locations(staff_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_status ON tasks(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_task_assignments_staff ON task_assignments(staff_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_patient_events_timeline ON patient_events(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_timeline ON system_events(entity_type, entity_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON transport_requests(status, priority, required_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON dispatch_queue(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON automation_jobs(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_comm_attempts_patient ON communication_attempts(patient_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_on_hand ON inventory_items(hospital_id, quantity_on_hand);

-- 18. Operational State Views
CREATE OR REPLACE VIEW patient_current_state AS
SELECT
    p.id AS patient_id,
    b.id AS bed_id,
    b.bed_number,
    r.id AS room_id,
    r.room_number,
    w.id AS ward_id,
    w.name AS ward_name,
    p.acuity,
    p.status AS patient_status,
    b.status AS bed_status,
    (
        SELECT row_to_json(v)
        FROM (
            SELECT heart_rate, respiratory_rate, spo2, temperature, systolic_bp, diastolic_bp, pain_score, recorded_at
            FROM vitals
            WHERE vitals.patient_id = p.id
            ORDER BY recorded_at DESC
            LIMIT 1
        ) v
    ) AS latest_vitals,
    (
        SELECT COUNT(*)::int
        FROM tasks
        WHERE tasks.patient_id = p.id AND tasks.status IN ('pending', 'assigned', 'acknowledged', 'in_progress')
    ) AS pending_task_count,
    (
        SELECT COUNT(*)::int
        FROM tasks
        WHERE tasks.patient_id = p.id AND (tasks.status = 'overdue' OR (tasks.due_at IS NOT NULL AND tasks.due_at < NOW() AND tasks.status NOT IN ('completed', 'cancelled')))
    ) AS overdue_task_count,
    (
        SELECT COUNT(*)::int
        FROM medication_administrations ma
        JOIN patient_medications pm ON pm.id = ma.patient_medication_id
        WHERE pm.patient_id = p.id AND ma.status IN ('scheduled', 'overdue')
    ) AS pending_medication_count,
    (
        SELECT tr.id
        FROM transport_requests tr
        WHERE tr.patient_id = p.id AND tr.status IN ('requested', 'assigned', 'in_transit')
        ORDER BY tr.created_at DESC
        LIMIT 1
    ) AS active_transport_id,
    (
        SELECT esc.id
        FROM escalations esc
        WHERE esc.patient_id = p.id AND esc.status = 'active'
        ORDER BY esc.created_at DESC
        LIMIT 1
    ) AS active_escalation_id,
    (
        SELECT dp.status
        FROM discharge_plans dp
        WHERE dp.patient_id = p.id
        ORDER BY dp.planned_discharge_at DESC NULLS LAST
        LIMIT 1
    ) AS discharge_status,
    (
        SELECT MAX(pe.timestamp)
        FROM patient_events pe
        WHERE pe.patient_id = p.id
    ) AS last_event_at,
    NOW() AS state_updated_at
FROM patients p
LEFT JOIN beds b ON b.current_patient_id = p.id
LEFT JOIN rooms r ON r.id = b.room_id
LEFT JOIN wards w ON w.id = r.ward_id;

-- 19. Triggers for Bed State Synchronization
CREATE OR REPLACE FUNCTION sync_bed_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE beds
        SET current_patient_id = NEW.patient_id,
            status = 'occupied'
        WHERE id = NEW.bed_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.released_at IS NOT NULL AND OLD.released_at IS NULL) THEN
        UPDATE beds
        SET current_patient_id = NULL,
            status = 'cleaning'
        WHERE id = NEW.bed_id;

        -- Auto-create cleaning job
        INSERT INTO cleaning_jobs (bed_id, priority, status)
        VALUES (NEW.bed_id, 3, 'requested');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bed_assignment ON bed_assignments;
CREATE TRIGGER trg_sync_bed_assignment
AFTER INSERT OR UPDATE ON bed_assignments
FOR EACH ROW EXECUTE FUNCTION sync_bed_on_assignment();

-- Trigger when cleaning job completes
CREATE OR REPLACE FUNCTION sync_bed_on_cleaning_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')) THEN
        UPDATE beds
        SET status = 'available'
        WHERE id = NEW.bed_id AND status = 'cleaning';

        INSERT INTO system_events (event_type, entity_type, entity_id, metadata)
        VALUES ('bed_cleaned', 'bed', NEW.bed_id, json_build_object('cleaning_job_id', NEW.id, 'new_status', 'available'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bed_cleaning ON cleaning_jobs;
CREATE TRIGGER trg_sync_bed_cleaning
AFTER UPDATE ON cleaning_jobs
FOR EACH ROW EXECUTE FUNCTION sync_bed_on_cleaning_complete();

-- 20. Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE beds;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_events;
ALTER PUBLICATION supabase_realtime ADD TABLE patient_events;
ALTER PUBLICATION supabase_realtime ADD TABLE system_events;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE cleaning_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE transport_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
ALTER PUBLICATION supabase_realtime ADD TABLE warden_actions;

-- 21. Row Level Security
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevators ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevator_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE warden_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warden_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Standard RLS Policies: Authenticated users can read and write operational ward data
-- Service role bypasses RLS automatically in Supabase
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'hospitals', 'departments', 'wards', 'rooms', 'beds',
        'navigation_nodes', 'navigation_edges', 'staff', 'staff_shifts',
        'staff_skills', 'staff_locations', 'staff_current_locations',
        'patients', 'contacts', 'patient_contacts', 'patient_conditions',
        'patient_allergies', 'patient_preferences', 'vitals', 'medications',
        'patient_medications', 'medication_administrations', 'lab_orders',
        'lab_results', 'procedures', 'bed_assignments', 'tasks',
        'task_assignments', 'task_dependencies', 'task_events',
        'transport_resources', 'transport_requests', 'transport_events',
        'patient_transfers', 'discharge_plans', 'resource_types',
        'resources', 'resource_assignments', 'inventory_items',
        'inventory_transactions', 'facility_requests', 'maintenance_jobs',
        'elevators', 'elevator_events', 'cleaning_jobs',
        'communication_contacts', 'communication_attempts', 'escalations',
        'escalation_steps', 'notifications', 'dispatch_queue', 'printers',
        'print_jobs', 'notification_queue', 'automation_jobs',
        'patient_events', 'system_events', 'warden_sessions',
        'warden_actions', 'voice_interactions', 'feedback_requests',
        'feedback_responses', 'call_tasks', 'system_alerts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow anon read access" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Allow anon read access" ON %I FOR SELECT TO anon USING (true)', tbl);
    END LOOP;
END $$;
