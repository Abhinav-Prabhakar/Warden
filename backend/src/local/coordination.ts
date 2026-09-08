import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { InMemoryOperationsRepository } from '../adapters/in-memory-repository.js';
import type { TransportIntent, TransportTask } from '../domain/types.js';

export const WARD = '00000000-0000-4000-8000-000000000007';
export const NURSE = '00000000-0000-4000-8000-000000000001';
export const bedId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const active = (t: TransportTask) => !['completed', 'cancelled', 'failed'].includes(t.status);
const fail = (message: string, statusCode = 409) => Object.assign(new Error(message), { statusCode });
type Session = { revision: number; lastIntent?: TransportIntent; commands: Map<number, { message: string; result: Promise<unknown> }> };

// This harness is mounted ONLY in explicit simulation mode. All task operations use
// the backend repository. It makes no phone calls and never fabricates acceptance.
export class LocalCoordination {
  private sessions = new Map<string, Session>();
  private queue: Promise<unknown> = Promise.resolve();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(readonly repository: InMemoryOperationsRepository, readonly lookupMs = 2500, readonly timeoutMs = 20000) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private session(id: string) {
    let session = this.sessions.get(id);
    if (!session) {
      if (this.sessions.size >= 1000) throw fail('Simulation session limit reached; restart backend.', 429);
      session = { revision: 0, commands: new Map() };
      this.sessions.set(id, session);
    }
    return session;
  }
  interrupt(id: string, revision: number) {
    const session = this.session(id);
    if (revision < session.revision) throw fail('STALE_OPERATION');
    session.revision = revision;
    return { revision, text: 'Pending work interrupted. Dispatched tasks still require cancellation acknowledgement.' };
  }
  command(id: string, revision: number, message: string): Promise<unknown> {
    const session = this.session(id);
    if (revision < session.revision) return Promise.reject(fail('STALE_OPERATION'));
    const previous = session.commands.get(revision);
    if (previous) return previous.message === message ? previous.result : Promise.reject(fail('Revision already used for another request'));
    this.interrupt(id, revision);
    const result = this.execute(id, session, revision, message.trim());
    session.commands.set(revision, { message, result });
    return result;
  }
  private async execute(id: string, session: Session, revision: number, message: string) {
    const current = () => { if (session.revision !== revision) throw fail('STALE_OPERATION'); };
    const replacement = /^(?:wait[,.!—\s-]*)?cancel[,.!—\s-]*(?:check\s+)?bed\s*(\d+)\s+instead[.!]?$/i.exec(message);
    const transport = /^(?:arrange\s+)?transport\s+(?:for\s+|patient\s+from\s+)?bed\s*(\d+)\s+to\s+([a-z ]+?)(?:\s+by\s+(wheelchair|stretcher))?[.!]?$/i.exec(message);
    const previousIntent = session.lastIntent;
    const cancellation = /^cancel(?:\s+bed\s*(\d+))?[.!]?$/i.exec(message);
    if (cancellation && !replacement) {
      const target = cancellation[1] ? bedId(Number(cancellation[1])) : previousIntent?.bedId;
      if (!target) throw fail('Specify the bed to cancel.', 400);
      return this.serial(async () => {
        current();
        const task = await this.repository.findActiveTransportTask(target);
        if (task) await this.cancel(task);
        await this.event(id, revision, 'request.cancelled', task?.id);
        return { text: task ? this.describe((await this.repository.getTransportTask(task.id))!) : 'Pending request cancelled; no task was dispatched.', revision };
      });
    }
    if (/^(hello|hi|help|status)[.!]?$/i.test(message)) return { revision, text: 'Simulation ready. Try: transport Bed 18 to Radiology by wheelchair. Worker acceptance is manual; no phone is called.' };
    if (!transport && !replacement) throw fail('Transport only. Use: transport Bed 18 to Radiology by wheelchair. To change a pending request: cancel, Bed 21 instead.', 400);
    if (replacement && !previousIntent) throw fail('No previous request to replace. Specify bed and destination.', 400);
    const intent: TransportIntent = replacement
      ? { ...previousIntent!, bedId: bedId(Number(replacement[1])) }
      : { type: 'CREATE_TRANSPORT', bedId: bedId(Number(transport![1])), destination: transport![2]!.trim(), urgency: 'routine', transportMode: transport![3]?.toLowerCase() as 'wheelchair' | 'stretcher' || 'wheelchair' };
    const destination = ['Radiology', 'Pharmacy'].find(d => d.toLowerCase() === intent.destination.toLowerCase());
    if (!destination) throw fail('Destination unavailable. This synthetic ward supports Radiology and Pharmacy.', 400);
    intent.destination = destination;
    session.lastIntent = intent;
    await this.event(id, revision, 'lookup.started', undefined, { bedId: intent.bedId });
    // Deliberately leave lookup running after interruption to exercise late-result fencing.
    await delay(this.lookupMs);
    if (session.revision !== revision) {
      await this.event(id, revision, 'lookup.stale_discarded', undefined, { bedId: intent.bedId });
      throw fail('STALE_OPERATION');
    }
    return this.serial(async () => {
      current();
      const bed = await this.repository.getBedState(intent.bedId);
      current();
      if (!bed) throw fail('Bed not found. Synthetic beds: 8, 18, 21, 22.', 400);
      if (!bed.patientId || !bed.patientReadyForTransport) throw fail('Patient is not ready for transport.', 409);
      if (replacement && previousIntent?.bedId !== intent.bedId) {
        const old = await this.repository.findActiveTransportTask(previousIntent!.bedId);
        current();
        if (old) await this.cancel(old);
      }
      const duplicate = await this.repository.findActiveTransportTask(bed.id);
      current();
      if (duplicate) {
        if (duplicate.destination !== destination || duplicate.transportMode !== intent.transportMode) throw fail(`Existing task ${duplicate.id}: ${this.describe(duplicate)} Cancel it before changing its destination or mode.`);
        return { task: duplicate, revision, text: `Existing request. ${this.describe(duplicate)}` };
      }
      // In-memory mutation occurs synchronously inside createTransportTask. The last
      // fence and insertion share a JS turn. Do not reuse this guarantee for SQL.
      const task = await this.repository.createTransportTask({ patientId: bed.patientId, bedId: bed.id, wardId: WARD, originZone: bed.zone, destination, transportMode: intent.transportMode!, urgency: intent.urgency, requestedBy: NURSE, status: 'requested' }, `${id}:${revision}`);
      await this.event(id, revision, 'task.created', task.id);
      await this.repository.transitionTask(task.id, ['requested'], 'dispatching', NURSE);
      await this.offer(task.id);
      const saved = (await this.repository.getTransportTask(task.id))!;
      return { task: saved, revision, text: `Simulation request saved. ${this.describe(saved)}${replacement ? ' Any earlier dispatched request must be acknowledged separately.' : ''}` };
    });
  }
  private describe(task: TransportTask) {
    const bed = this.repository.beds.get(task.bedId)?.label ?? task.bedId;
    const worker = task.assignedStaffId ? this.repository.staff.get(task.assignedStaffId)?.name : undefined;
    return `${bed} to ${task.destination} by ${task.transportMode}: ${task.status.replaceAll('_', ' ')}${worker ? ` (${worker})` : ''}.${task.status === 'assigned' ? ' Awaiting simulated worker acknowledgement; no phone call was made.' : ''}`;
  }
  private async offer(taskId: string) {
    const tried = [...this.repository.attempts.values()].filter(a => a.taskId === taskId).map(a => a.staffId);
    const candidates = await this.repository.findEligibleTransporters(WARD, tried);
    const worker = candidates.find(s => ![...this.repository.tasks.values()].some(t => t.id !== taskId && active(t) && t.assignedStaffId === s.id));
    if (!worker) {
      await this.repository.transitionTask(taskId, ['dispatching'], 'failed');
      await this.repository.notifyCoordinator(WARD, taskId, 'All simulated workers unavailable, rejected or timed out.');
      await this.event(taskId, 0, 'coordinator.notified_simulation', taskId);
      return;
    }
    await this.repository.assignTask(taskId, worker.id);
    const attempt = await this.repository.createDispatchAttempt({ taskId, staffId: worker.id, attemptNumber: tried.length + 1, responseDeadline: new Date(Date.now() + this.timeoutMs) });
    await this.event(taskId, 0, 'dispatch.offered_simulation', taskId, { staffId: worker.id, deadline: attempt.responseDeadline.toISOString() });
    const timer = setTimeout(() => { void this.serial(() => this.respond(taskId, worker.id, 'timeout', attempt.id)).catch(() => undefined); }, this.timeoutMs);
    timer.unref();
    this.timers.set(taskId, timer);
  }
  private clearTimer(taskId: string) { clearTimeout(this.timers.get(taskId)); this.timers.delete(taskId); }
  private async cancel(task: TransportTask) {
    if (task.status === 'cancellation_requested') return;
    this.clearTimer(task.id);
    await this.repository.transitionTask(task.id, [task.status], task.status === 'requested' ? 'cancelled' : 'cancellation_requested', NURSE);
  }
  action(taskId: string, staffId: string, action: 'accept' | 'reject' | 'complete' | 'cancel' | 'ack_cancel') {
    return this.serial(async () => {
      const task = await this.repository.getTransportTask(taskId);
      if (!task) throw fail('Task not found', 404);
      if (action === 'cancel') {
        if (staffId !== NURSE) throw fail('Only the synthetic nurse can request cancellation', 403);
        if (!active(task)) throw fail('Task is already closed');
        await this.cancel(task);
      } else {
        if (staffId !== task.assignedStaffId) throw fail('Only the offered worker can respond', 403);
        if (action === 'complete' || action === 'ack_cancel') {
          const target = action === 'complete' ? 'completed' : 'cancelled';
          const from = action === 'complete' ? ['accepted', 'in_progress'] : ['cancellation_requested'];
          if (task.status !== target) {
            if (!from.includes(task.status)) throw fail(`Cannot ${action} while ${task.status}`);
            await this.repository.transitionTask(taskId, [task.status], target, staffId);
          }
        } else await this.respond(taskId, staffId, action === 'accept' ? 'accepted' : 'rejected');
      }
      const saved = (await this.repository.getTransportTask(taskId))!;
      return { task: saved, text: this.describe(saved) };
    });
  }
  private async respond(taskId: string, staffId: string, response: 'accepted' | 'rejected' | 'timeout', attemptId?: string) {
    const task = (await this.repository.getTransportTask(taskId))!;
    const attempt = [...this.repository.attempts.values()].find(a => a.taskId === taskId && a.staffId === staffId && !a.response);
    if (response === 'accepted' && task.status === 'accepted' && task.assignedStaffId === staffId) return;
    if (task.status !== 'assigned' || task.assignedStaffId !== staffId || !attempt || (attemptId && attempt.id !== attemptId)) throw fail('Offer is no longer active');
    this.clearTimer(taskId);
    await this.repository.completeDispatchAttempt(attempt.id, response);
    if (response === 'accepted') await this.repository.transitionTask(taskId, ['assigned'], 'accepted', staffId);
    else {
      await this.repository.transitionTask(taskId, ['assigned'], 'dispatching', staffId);
      await this.event(taskId, 0, `dispatch.${response}`, taskId, { staffId });
      await this.offer(taskId);
    }
  }
  private event(operationId: string, revision: number, type: string, taskId?: string, metadata?: Record<string, unknown>) {
    return this.repository.appendEvent({ operationId, revision, type, taskId, metadata, provider: 'manual-simulation' });
  }
  async state() {
    return { mode: 'simulation', storage: 'memory (resets on backend restart)', telephony: 'manual simulation; no calls', reasoning: 'deterministic transport parser', lookupMs: this.lookupMs, timeoutMs: this.timeoutMs, ...(await this.repository.getWardState(WARD)), staff: [...this.repository.staff.values()].map(({ id, name, role }) => ({ id, name, role })), attempts: [...this.repository.attempts.values()], events: this.repository.events.slice(-60), notifications: this.repository.notifications };
  }
  close() { for (const timer of this.timers.values()) clearTimeout(timer); }
}

export function seedLocal(repository: InMemoryOperationsRepository) {
  for (const [id, name, role] of [[NURSE, 'Nurse Priya', 'nurse'], [bedId(2), 'Porter Arjun', 'transporter'], [bedId(3), 'Porter Ravi', 'transporter']] as const) {
    repository.staff.set(id, { id, name, role, phone: '', pinHash: '', onDuty: true, availability: 'available', currentZone: 'ward-7-a', skills: role === 'transporter' ? ['patient_transport'] : [], activeTaskCount: 0 });
  }
  for (const n of [8, 18, 21, 22]) repository.beds.set(bedId(n), { id: bedId(n), label: `Bed ${n}`, wardId: WARD, zone: 'ward-7-a', status: 'occupied', patientId: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`, patientReadyForTransport: n !== 22 });
}
