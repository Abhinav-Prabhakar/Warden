import type { OperationsRepository, TelephonyProvider } from "../ports/index.js";
import type { OperationEvent, TransportIntent, TransportTask } from "../domain/types.js";

export class WorkflowError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class TransportWorkflow {
  constructor(
    private readonly repository: OperationsRepository,
    private readonly telephony: TelephonyProvider,
    private readonly dispatchTimeoutMs = 20_000,
  ) {}

  async createAndDispatch(input: {
    intent: TransportIntent;
    requestedBy: string;
    idempotencyKey: string;
    operationId: string;
    revision: number;
    signal?: AbortSignal;
    assertCurrent?: () => void;
  }): Promise<TransportTask> {
    const { intent } = input;
    input.assertCurrent?.();
    const bed = await this.repository.getBedState(intent.bedId);
    input.assertCurrent?.();
    if (!bed) throw new WorkflowError("BED_NOT_FOUND", `Bed ${intent.bedId} was not found.`);
    if (!bed.patientId || bed.status !== "occupied") {
      throw new WorkflowError("BED_NOT_OCCUPIED", `${bed.label} does not have an active patient.`);
    }
    if (!bed.patientReadyForTransport) {
      throw new WorkflowError("PATIENT_NOT_READY", `The patient in ${bed.label} is not ready for transport.`);
    }
    const duplicate = await this.repository.findActiveTransportTask(bed.id);
    input.assertCurrent?.();
    if (duplicate) return duplicate;

    const task = await this.repository.createTransportTask(
      {
        patientId: bed.patientId,
        bedId: bed.id,
        wardId: bed.wardId,
        originZone: bed.zone,
        destination: intent.destination,
        urgency: intent.urgency,
        transportMode: intent.transportMode ?? "wheelchair",
        requestedBy: input.requestedBy,
        status: "requested",
      },
      input.idempotencyKey,
    );
    await this.event(task.id, input, "transport.requested", { destination: intent.destination });
    input.assertCurrent?.();
    await this.repository.transitionTask(task.id, ["requested"], "dispatching", input.requestedBy);

    const rejected: string[] = [];
    let attemptNumber = 0;
    for (;;) {
      input.assertCurrent?.();
      const candidates = await this.repository.findEligibleTransporters(bed.wardId, rejected);
      input.assertCurrent?.();
      const candidate = candidates[0];
      if (!candidate) {
        await this.repository.transitionTask(task.id, ["dispatching", "assigned"], "failed");
        await this.repository.notifyCoordinator(bed.wardId, task.id, "No transporter accepted the request.");
        await this.event(task.id, input, "transport.escalated", { reason: "no_available_candidate" });
        return (await this.repository.getTransportTask(task.id))!;
      }

      attemptNumber += 1;
      const attempt = await this.repository.createDispatchAttempt({
        taskId: task.id,
        staffId: candidate.id,
        attemptNumber,
        responseDeadline: new Date(Date.now() + this.dispatchTimeoutMs),
      });
      const call = await this.telephony.dial({
        phone: candidate.phone,
        roomName: `warden-dispatch-${task.id}`,
        participantIdentity: `transporter-${candidate.id}`,
        taskId: task.id,
        prompt: `${candidate.name}, transport is requested from ${bed.label} to ${intent.destination}. Say accept or press 1. Say reject or press 2.`,
        timeoutMs: this.dispatchTimeoutMs,
      });
      await this.event(task.id, input, "dispatch.contacted", { staffId: candidate.id, callId: call.providerCallId });

      let response: "accepted" | "rejected" | "timeout" | "failed";
      try {
        response = await this.telephony.waitForResponse(call.id, this.dispatchTimeoutMs, input.signal);
        await this.repository.completeDispatchAttempt(attempt.id, response, call.providerCallId);
      } finally {
        await this.telephony.hangup(call.id);
      }
      input.assertCurrent?.();

      if (response === "accepted") {
        const assigned = await this.repository.assignTask(task.id, candidate.id);
        await this.repository.transitionTask(assigned.id, ["assigned"], "accepted", candidate.id);
        await this.event(task.id, input, "dispatch.accepted", { staffId: candidate.id });
        return (await this.repository.getTransportTask(task.id))!;
      }

      rejected.push(candidate.id);
      await this.event(task.id, input, `dispatch.${response}`, { staffId: candidate.id });
    }
  }

  async cancel(taskId: string, actorId: string, operationId: string, revision: number): Promise<TransportTask> {
    const task = await this.repository.getTransportTask(taskId);
    if (!task) throw new WorkflowError("TASK_NOT_FOUND", "Transport task was not found.");
    if (["completed", "cancelled", "failed"].includes(task.status)) {
      throw new WorkflowError("TERMINAL_TASK", `Task is already ${task.status}.`);
    }
    const immediate = ["requested", "dispatching"].includes(task.status);
    const next = immediate ? "cancelled" : "cancellation_requested";
    const updated = await this.repository.transitionTask(task.id, [task.status], next, actorId);
    await this.repository.appendEvent({ operationId, revision, taskId, actorId, type: `transport.${next}` });
    return updated;
  }

  private event(
    taskId: string,
    input: { operationId: string; revision: number; requestedBy: string },
    type: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const event: OperationEvent = {
      taskId,
      operationId: input.operationId,
      revision: input.revision,
      actorId: input.requestedBy,
      type,
      metadata,
    };
    return this.repository.appendEvent(event);
  }
}
