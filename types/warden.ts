import { Database, BedStatus, PatientAcuity, TaskStatus, TaskType, TaskUrgency, PrintJobStatus } from './database';

export interface WardBedDetail {
  id: string;
  bed_number: string;
  bed_type: string;
  status: BedStatus;
  room_id: string;
  room_number: string;
  floor_number: number;
  isolation_capable: boolean;
  oxygen_available: boolean;
  monitor_available: boolean;
  patient: {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    acuity: PatientAcuity;
    status: string;
    admission_at: string;
    discharge_at: string | null;
    latest_vitals: {
      heart_rate?: number;
      respiratory_rate?: number;
      spo2?: number;
      temperature?: number;
      systolic_bp?: number;
      diastolic_bp?: number;
      pain_score?: number;
      recorded_at?: string;
    } | null;
    conditions: Array<{ code: string; name: string; severity: string }>;
    allergies: Array<{ allergen: string; reaction: string | null; severity: string }>;
    pending_tasks: number;
    overdue_tasks: number;
    pending_medications: number;
    discharge_status: string | null;
  } | null;
  active_tasks: Array<{
    id: string;
    title: string;
    task_type: TaskType;
    priority: number;
    urgency: TaskUrgency;
    status: TaskStatus;
    due_at: string | null;
    assigned_to: string | null;
  }>;
  cleaning_job?: {
    id: string;
    status: string;
    started_at: string | null;
  } | null;
  blockers?: string[];
}

export interface WardLiveState {
  timestamp: string;
  hospital: {
    id: string;
    name: string;
    code: string;
    timezone: string;
  };
  ward: {
    id: string;
    name: string;
    code: string;
    capacity: number;
  };
  metrics: {
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    blocked_beds: number;
    cleaning_beds: number;
    reserved_beds: number;
    urgent_patients: number;
    critical_patients: number;
    active_tasks: number;
    overdue_tasks: number;
    on_duty_staff: number;
    active_alerts: number;
    active_print_jobs: number;
  };
  beds: WardBedDetail[];
  staff_on_duty: Array<{
    id: string;
    display_name: string;
    role: string;
    status: string;
    phone: string | null;
    active_tasks_count: number;
    location_name: string | null;
  }>;
  active_alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    description: string;
    patient_id: string | null;
    triggered_at: string;
  }>;
}

export interface TemporalChangeSummary {
  since: string;
  evaluated_at: string;
  has_critical_changes: boolean;
  summary_text: string;
  changes: {
    deteriorations: Array<{ patient: string; bed: string; detail: string; timestamp: string }>;
    new_urgent_tasks: Array<{ id: string; title: string; bed: string; urgency: string }>;
    task_completions: Array<{ id: string; title: string; completed_by: string; timestamp: string }>;
    bed_transitions: Array<{ bed: string; from: string; to: string; reason?: string }>;
    staff_status_changes: Array<{ staff: string; role: string; old_status: string; new_status: string }>;
    system_alerts: Array<{ title: string; severity: string; timestamp: string }>;
    printer_status_changes: Array<{ printer: string; status: string }>;
  };
}

export interface BlockerChainItem {
  type: 'task' | 'cleaning' | 'transport' | 'paperwork' | 'doctor_signoff' | 'equipment';
  id: string;
  title: string;
  status: string;
  assigned_to?: string;
  waiting_on?: string;
  downstream_impact?: string;
}

export interface BedBlockerTrace {
  bed_id: string;
  bed_number: string;
  is_blocked: boolean;
  primary_blocker_reason: string;
  chain: BlockerChainItem[];
  resolution_steps: string[];
}

export interface TaskBlockerTrace {
  task_id: string;
  title: string;
  status: TaskStatus;
  is_blocked: boolean;
  unresolved_dependencies: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    assigned_to: string | null;
  }>;
}

export interface SelfInvalidationCheck {
  is_stale: boolean;
  reason?: string;
  state_at_query: Record<string, unknown>;
  state_current: Record<string, unknown>;
  correction?: string;
}

export interface BottleneckItem {
  area: 'printer' | 'beds' | 'staff' | 'transport' | 'inventory' | 'cleaning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  cause: string;
  affected_entities: string[];
  recommended_action: string;
}

export interface ShiftHandoffData {
  generated_at: string;
  shift_period: string;
  coordinator: string;
  ward: string;
  critical_watch_list: Array<{
    patient_name: string;
    bed: string;
    acuity: string;
    key_concerns: string;
    vitals_summary: string;
  }>;
  outstanding_tasks: Array<{
    title: string;
    bed: string;
    assigned_to: string;
    due_at: string | null;
    is_overdue: boolean;
  }>;
  pending_discharges: Array<{
    patient_name: string;
    bed: string;
    status: string;
    remaining_blockers: string[];
  }>;
  blocked_beds_and_reasons: Array<{
    bed: string;
    blocker_reason: string;
  }>;
  resource_and_equipment_issues: string[];
  printer_and_facility_status: string[];
}
