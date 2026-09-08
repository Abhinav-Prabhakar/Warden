import { randomUUID } from "node:crypto";
import type { OperationsRepository, TextToSpeechProvider } from "../ports/index.js";
import type { Staff, TransportIntent, TransportTask } from "../domain/types.js";
import { TransportWorkflow, WorkflowError } from "../workflow/transport-workflow.js";

export type ConversationState =
  | "CONNECTED"
  | "VERIFYING_CALLER"
  | "READY"
  | "COLLECTING_REQUEST"
  | "VALIDATING"
  | "AWAITING_CONFIRMATION"
  | "DISPATCHING"
  | "WAITING_FOR_ACCEPTANCE"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export class StaleOperationError extends Error {}

export class ConversationController {
  private state: ConversationState = "CONNECTED";
  private caller?: Staff;
  private verified = false;
  private revision = 0;
  private operationId = randomUUID();
  private abortController = new AbortController();
  private synthesisId?: string;

  constructor(
    private readonly repository: OperationsRepository,
    private readonly workflow: TransportWorkflow,
    private readonly tts: TextToSpeechProvider,
    private readonly callSessionId: string,
  ) {}

  get currentState(): ConversationState { return this.state; }
  get currentRevision(): number { return this.revision; }

  async identify(phone: string): Promise<Staff | null> {
    this.verified = false;
    this.state = "VERIFYING_CALLER";
    this.caller = (await this.repository.getCaller(phone)) ?? undefined;
    return this.caller ?? null;
  }

  async verifyCaller(pin: string): Promise<boolean> {
    if (!this.caller) return false;
    const valid = await this.repository.verifyPin(this.caller.id, pin);
    this.verified = valid;
    this.state = valid ? "READY" : "VERIFYING_CALLER";
    return valid;
  }

  beginTurn(): { operationId: string; revision: number; signal: AbortSignal } {
    this.abortController.abort("superseded");
    this.abortController = new AbortController();
    this.operationId = randomUUID();
    this.revision += 1;
    this.state = "COLLECTING_REQUEST";
    return { operationId: this.operationId, revision: this.revision, signal: this.abortController.signal };
  }

  async interrupt(): Promise<void> {
    this.abortController.abort("interrupted");
    if (this.synthesisId) await this.tts.cancel(this.synthesisId);
    this.revision += 1;
    this.state = "READY";
    await this.repository.appendEvent({
      callSessionId: this.callSessionId,
      operationId: this.operationId,
      revision: this.revision,
      actorId: this.caller?.id,
      type: "voice.interrupted",
    });
  }

  async handleTransport(intent: TransportIntent, idempotencyKey: string): Promise<TransportTask> {
    if (!this.caller || !this.verified) {
      throw new WorkflowError("UNVERIFIED_CALLER", "Verify the caller before creating a task.");
    }
    const turn = this.beginTurn();
    const expectedRevision = turn.revision;
    const assertCurrent = () => {
      if (this.revision !== expectedRevision || turn.signal.aborted) throw new StaleOperationError("Operation is obsolete.");
    };
    this.state = "VALIDATING";
    try {
      this.state = "DISPATCHING";
      const task = await this.workflow.createAndDispatch({
        intent,
        requestedBy: this.caller.id,
        idempotencyKey,
        operationId: turn.operationId,
        revision: turn.revision,
        signal: turn.signal,
        assertCurrent,
      });
      assertCurrent();
      this.state = task.status === "accepted" ? "COMPLETED" : "FAILED";
      return task;
    } catch (error) {
      if (error instanceof StaleOperationError || turn.signal.aborted) this.state = "CANCELLED";
      else this.state = "FAILED";
      throw error;
    }
  }

  async speak(text: string): Promise<AsyncIterable<Uint8Array>> {
    const synthesisId = randomUUID();
    this.synthesisId = synthesisId;
    const signal = this.abortController.signal;
    const stream = this.tts.stream(text, { synthesisId, signal });
    return (async function* () {
      for await (const chunk of stream) {
        if (signal.aborted) return;
        yield chunk.data;
      }
    })();
  }
}
