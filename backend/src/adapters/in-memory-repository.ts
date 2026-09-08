import { randomUUID } from "node:crypto";
import type { OperationsRepository } from "../ports/index.js";
import type { BedState, DispatchAttempt, DispatchResponse, OperationEvent, Staff, TransportTask } from "../domain/types.js";
import { verifyPin } from "../security/pin.js";

const activeStatuses: TransportTask["status"][] = ["requested", "dispatching", "assigned", "accepted", "in_progress", "cancellation_requested"];

export class InMemoryOperationsRepository implements OperationsRepository {
  readonly staff = new Map<string, Staff>();
  readonly beds = new Map<string, BedState>();
  readonly tasks = new Map<string, TransportTask>();
  readonly attempts = new Map<string, DispatchAttempt>();
  readonly events: OperationEvent[] = [];
  readonly notifications: Array<{ wardId: string; taskId: string; reason: string }> = [];
  private readonly idempotency = new Map<string, string>();

  async getCaller(phone: string) { return [...this.staff.values()].find(s => s.phone === phone) ?? null; }
  async verifyPin(staffId: string, pin: string) {
    const staff = this.staff.get(staffId);
    return staff ? verifyPin(pin, staff.pinHash) : false;
  }
  async getBedState(bedId: string) { return this.beds.get(bedId) ?? null; }
  async findEligibleTransporters(wardId: string, rejected: string[]) {
    const zone = [...this.beds.values()].find(b => b.wardId === wardId)?.zone;
    return [...this.staff.values()]
      .filter(s => s.role === "transporter" && s.onDuty && s.availability === "available" && s.skills.includes("patient_transport") && !rejected.includes(s.id))
      .sort((a, b) => Number(b.currentZone === zone) - Number(a.currentZone === zone) || a.activeTaskCount - b.activeTaskCount || a.id.localeCompare(b.id));
  }
  async findActiveTransportTask(bedId: string) {
    return [...this.tasks.values()].find(t => t.bedId === bedId && activeStatuses.includes(t.status)) ?? null;
  }
  async createTransportTask(input: Omit<TransportTask, "id" | "createdAt">, key: string) {
    const existingId = this.idempotency.get(key);
    if (existingId) return this.tasks.get(existingId)!;
    const task: TransportTask = { ...input, id: randomUUID(), createdAt: new Date() };
    this.tasks.set(task.id, task);
    this.idempotency.set(key, task.id);
    return task;
  }
  async getTransportTask(taskId: string) { return this.tasks.get(taskId) ?? null; }
  async transitionTask(taskId: string, from: TransportTask["status"][], to: TransportTask["status"], actorId?: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("TASK_NOT_FOUND");
    if (!from.includes(task.status)) throw new Error(`INVALID_TRANSITION:${task.status}:${to}`);
    const now = new Date();
    const updated: TransportTask = { ...task, status: to };
    if (to === "accepted") updated.acceptedAt = now;
    if (to === "completed") updated.completedAt = now;
    if (to === "cancelled") updated.cancelledAt = now;
    this.tasks.set(taskId, updated);
    await this.appendEvent({ operationId: randomUUID(), revision: 0, taskId, actorId, type: `task.${to}` });
    return updated;
  }
  async assignTask(taskId: string, staffId: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("TASK_NOT_FOUND");
    if (task.status !== "dispatching") throw new Error("TASK_ALREADY_ASSIGNED");
    const updated = { ...task, assignedStaffId: staffId, status: "assigned" as const };
    this.tasks.set(taskId, updated);
    return updated;
  }
  async createDispatchAttempt(input: Omit<DispatchAttempt, "id">) {
    const attempt = { ...input, id: randomUUID() };
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }
  async completeDispatchAttempt(id: string, response: DispatchResponse, providerCallId?: string) {
    const attempt = this.attempts.get(id);
    if (attempt) this.attempts.set(id, { ...attempt, response, providerCallId: providerCallId ?? attempt.providerCallId });
  }
  async appendEvent(event: OperationEvent) { this.events.push({ ...event, id: event.id ?? randomUUID(), createdAt: event.createdAt ?? new Date() }); }
  async listTaskEvents(taskId: string) { return this.events.filter(e => e.taskId === taskId); }
  async getWardState(wardId: string) {
    return { beds: [...this.beds.values()].filter(b => b.wardId === wardId), tasks: [...this.tasks.values()].filter(t => t.wardId === wardId) };
  }
  async notifyCoordinator(wardId: string, taskId: string, reason: string) { this.notifications.push({ wardId, taskId, reason }); }
}
