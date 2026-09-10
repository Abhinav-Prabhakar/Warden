import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OperationsRepository } from "../ports/index.js";
import type { BedState, DispatchAttempt, DispatchResponse, OperationEvent, Staff, TransportTask } from "../domain/types.js";

type Row = Record<string, unknown>;
const activeStatuses: TransportTask["status"][] = ["requested","dispatching","assigned","accepted","in_progress","cancellation_requested"];

export class SupabaseOperationsRepository implements OperationsRepository {
  private readonly db: SupabaseClient;
  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getCaller(phone: string): Promise<Staff | null> {
    const { data, error } = await this.db.from("staff").select("*").eq("phone", phone).maybeSingle();
    if (error) throw error;
    return data ? this.hydrateStaff(data as Row) : null;
  }

  async verifyPin(staffId: string, pin: string): Promise<boolean> {
    const { data, error } = await this.db.rpc("verify_staff_pin", { p_staff_id: staffId, p_pin: pin });
    if (error) throw error;
    return Boolean(data);
  }

  async getBedState(id: string): Promise<BedState | null> {
    let query = this.db.from("beds").select("*, rooms!inner(room_number, ward_id, wards!inner(id, code))");
    const bedNumber = id.trim();
    query = /^[0-9a-f-]{36}$/i.test(bedNumber)
      ? query.eq("id", bedNumber)
      : query.in("bed_number", [bedNumber, `Bed ${bedNumber.replace(/^bed\s*/i, "")}`]);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    const room = row.rooms as Row;
    const ward = room.wards as Row;
    const { data: readiness, error: readinessError } = await this.db
      .from("bed_transport_readiness").select("ready").eq("bed_id", String(row.id)).maybeSingle();
    if (readinessError) throw readinessError;
    return {
      id: String(row.id),
      label: /^bed\s+/i.test(String(row.bed_number)) ? String(row.bed_number) : `Bed ${String(row.bed_number)}`,
      wardId: String(ward.id),
      zone: `${String(ward.code)}-${String(room.room_number)}`,
      status: normalizeBedStatus(String(row.status)),
      patientId: row.current_patient_id ? String(row.current_patient_id) : undefined,
      patientReadyForTransport: readiness?.ready ?? false,
    };
  }

  async findEligibleTransporters(wardId: string, rejectedStaffIds: string[]): Promise<Staff[]> {
    let query = this.db.from("staff").select("*").eq("role", "porter").eq("is_on_duty", true).eq("status", "active");
    if (rejectedStaffIds.length) query = query.not("id", "in", `(${rejectedStaffIds.join(",")})`);
    const { data, error } = await query;
    if (error) throw error;
    const staff = await Promise.all((data ?? []).map(row => this.hydrateStaff(row as Row, wardId)));
    return staff
      .filter(person => person.phone && (person.skills.includes("patient_transport") || person.skills.includes("transport")))
      .sort((a, b) => Number(b.currentZone === wardId) - Number(a.currentZone === wardId)
        || a.activeTaskCount - b.activeTaskCount || a.id.localeCompare(b.id));
  }

  async findActiveTransportTask(bedId: string): Promise<TransportTask | null> {
    const { data, error } = await this.db.from("transport_tasks").select("*").eq("bed_id", bedId).in("status", activeStatuses).maybeSingle();
    if (error) throw error;
    return data ? mapTask(data as Row) : null;
  }

  async createTransportTask(input: Omit<TransportTask, "id" | "createdAt">, key: string): Promise<TransportTask> {
    const row = toTaskRow(input, key);
    const { data, error } = await this.db.rpc("create_transport_task_with_projection", {
      p_patient_id: row.patient_id, p_bed_id: row.bed_id, p_ward_id: row.ward_id,
      p_origin_zone: row.origin_zone, p_destination: row.destination, p_urgency: row.urgency,
      p_transport_mode: row.transport_mode, p_requested_by: row.requested_by,
      p_status: row.status, p_idempotency_key: row.idempotency_key,
    });
    if (error) throw error;
    return mapTask(data as Row);
  }

  async getTransportTask(id: string): Promise<TransportTask | null> {
    const { data, error } = await this.db.from("transport_tasks").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapTask(data as Row) : null;
  }

  async transitionTask(taskId: string, from: TransportTask["status"][], to: TransportTask["status"], actorId?: string): Promise<TransportTask> {
    const { data, error } = await this.db.rpc("transition_transport_task", { p_task_id: taskId, p_from: from, p_to: to, p_actor_id: actorId ?? null });
    if (error) throw error;
    return mapTask(data as Row);
  }

  async assignTask(taskId: string, staffId: string): Promise<TransportTask> {
    const { data, error } = await this.db.rpc("assign_transport_task", { p_task_id: taskId, p_staff_id: staffId });
    if (error) throw error;
    return mapTask(data as Row);
  }

  async createDispatchAttempt(input: Omit<DispatchAttempt, "id">): Promise<DispatchAttempt> {
    const { data, error } = await this.db.from("dispatch_attempts").insert({
      task_id: input.taskId, staff_id: input.staffId, attempt_number: input.attemptNumber,
      response_deadline: input.responseDeadline.toISOString(),
    }).select("*").single();
    if (error) throw error;
    return { id: data.id, taskId: data.task_id, staffId: data.staff_id, attemptNumber: data.attempt_number, responseDeadline: new Date(data.response_deadline) };
  }

  async completeDispatchAttempt(id: string, response: DispatchResponse, providerCallId?: string): Promise<void> {
    const patch: Row = { response, responded_at: new Date().toISOString() };
    if (providerCallId) patch.provider_call_id = providerCallId;
    const { error } = await this.db.from("dispatch_attempts").update(patch).eq("id", id);
    if (error) throw error;
  }

  async appendEvent(event: OperationEvent): Promise<void> {
    const { error } = await this.db.from("operation_events").insert({
      task_id: event.taskId, call_session_id: event.callSessionId, operation_id: event.operationId,
      revision: event.revision, event_type: event.type, actor_staff_id: event.actorId, provider: event.provider,
      payload: event.metadata ?? {},
    });
    if (error) throw error;
  }

  async listTaskEvents(taskId: string): Promise<OperationEvent[]> {
    const { data, error } = await this.db.from("operation_events").select("*").eq("task_id", taskId).order("created_at");
    if (error) throw error;
    return (data ?? []).map(row => mapEvent(row as Row));
  }

  async getWardState(wardId: string): Promise<{ beds: BedState[]; tasks: TransportTask[] }> {
    const { data: rooms, error: roomError } = await this.db.from("rooms").select("id").eq("ward_id", wardId);
    if (roomError) throw roomError;
    const roomIds = (rooms ?? []).map(room => room.id);
    const [{ data: beds, error: bedError }, { data: tasks, error: taskError }] = await Promise.all([
      roomIds.length ? this.db.from("beds").select("id").in("room_id", roomIds) : Promise.resolve({ data: [], error: null }),
      this.db.from("transport_tasks").select("*").eq("ward_id", wardId),
    ]);
    if (bedError) throw bedError;
    if (taskError) throw taskError;
    const bedStates = (await Promise.all((beds ?? []).map(bed => this.getBedState(bed.id)))).filter((bed): bed is BedState => Boolean(bed));
    return { beds: bedStates, tasks: (tasks ?? []).map(row => mapTask(row as Row)) };
  }

  async notifyCoordinator(wardId: string, taskId: string, reason: string): Promise<void> {
    const { error } = await this.db.from("coordinator_notifications").insert({ ward_id: wardId, task_id: taskId, reason });
    if (error) throw error;
  }

  private async hydrateStaff(row: Row, wardId?: string): Promise<Staff> {
    const id = String(row.id);
    const [{ data: skills, error: skillError }, { count, error: countError }, { data: shift, error: shiftError }] = await Promise.all([
      this.db.from("staff_skills").select("skill_code").eq("staff_id", id).eq("certified", true),
      this.db.from("transport_tasks").select("id", { count: "exact", head: true }).eq("assigned_staff_id", id).in("status", ["assigned","accepted","in_progress"]),
      wardId
        ? this.db.from("staff_shifts").select("ward_id").eq("staff_id", id).eq("ward_id", wardId).eq("status", "active").maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (skillError) throw skillError;
    if (countError) throw countError;
    if (shiftError) throw shiftError;
    return {
      id,
      name: String(row.display_name),
      role: row.role === "porter" ? "transporter" : row.role === "nurse" ? "nurse" : "coordinator",
      phone: String(row.phone ?? ""),
      pinHash: "",
      onDuty: Boolean(row.is_on_duty),
      availability: row.status === "active" ? "available" : row.status === "busy" ? "busy" : "off_duty",
      currentZone: shift ? String(shift.ward_id) : "",
      skills: (skills ?? []).map(skill => String(skill.skill_code)),
      activeTaskCount: count ?? 0,
    };
  }

}

const normalizeBedStatus = (status: string): BedState["status"] =>
  status === "occupied" || status === "cleaning" || status === "maintenance" ? status : "available";

const mapTask = (row: Row): TransportTask => ({
  id: String(row.id), patientId: String(row.patient_id), bedId: String(row.bed_id), wardId: String(row.ward_id),
  originZone: String(row.origin_zone), destination: String(row.destination), urgency: row.urgency as TransportTask["urgency"],
  transportMode: row.transport_mode as TransportTask["transportMode"], requestedBy: String(row.requested_by),
  assignedStaffId: row.assigned_staff_id ? String(row.assigned_staff_id) : undefined,
  status: row.status as TransportTask["status"], createdAt: new Date(String(row.created_at)),
  acceptedAt: row.accepted_at ? new Date(String(row.accepted_at)) : undefined,
  completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
  cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)) : undefined,
});

const toTaskRow = (task: Omit<TransportTask, "id" | "createdAt">, key: string): Row => ({
  patient_id: task.patientId, bed_id: task.bedId, ward_id: task.wardId, origin_zone: task.originZone,
  destination: task.destination, urgency: task.urgency, transport_mode: task.transportMode,
  requested_by: task.requestedBy, status: task.status, idempotency_key: key,
});

const mapEvent = (row: Row): OperationEvent => ({
  id: String(row.id), taskId: row.task_id ? String(row.task_id) : undefined,
  callSessionId: row.call_session_id ? String(row.call_session_id) : undefined,
  operationId: String(row.operation_id), revision: Number(row.revision), type: String(row.event_type),
  actorId: row.actor_staff_id ? String(row.actor_staff_id) : undefined, provider: row.provider ? String(row.provider) : undefined,
  metadata: (row.payload ?? {}) as Record<string, unknown>, createdAt: new Date(String(row.created_at)),
});
