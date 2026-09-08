import type {
  AgentInput,
  AudioChunk,
  BedState,
  CallSession,
  DispatchAttempt,
  DispatchResponse,
  IncomingCall,
  OperationEvent,
  OutboundCallRequest,
  Staff,
  StructuredIntent,
  TransportTask,
} from "../domain/types.js";

export interface TelephonyProvider {
  answerCall(call: IncomingCall): Promise<CallSession>;
  dial(request: OutboundCallRequest): Promise<CallSession>;
  waitForResponse(callId: string, timeoutMs: number, signal?: AbortSignal): Promise<DispatchResponse>;
  hangup(callId: string): Promise<void>;
  sendDtmf(callId: string, digits: string): Promise<void>;
}

export interface SpeechRecognitionStream {
  stop(): Promise<void>;
  [Symbol.asyncIterator](): AsyncIterator<{ text: string; final: boolean }>;
}

export interface SpeechToTextProvider {
  createStream(options: { language: string; signal?: AbortSignal }): SpeechRecognitionStream;
}

export interface TextToSpeechProvider {
  readonly name: string;
  readonly model: string;
  readonly voice: string;
  stream(text: string, options: { synthesisId: string; signal?: AbortSignal }): AsyncIterable<AudioChunk>;
  cancel(synthesisId: string): Promise<void>;
}

export interface ReasoningProvider {
  interpret(input: AgentInput, signal?: AbortSignal): Promise<StructuredIntent>;
}

export interface OperationsRepository {
  getCaller(phone: string): Promise<Staff | null>;
  verifyPin(staffId: string, pin: string): Promise<boolean>;
  getBedState(bedId: string): Promise<BedState | null>;
  findEligibleTransporters(wardId: string, rejectedStaffIds: string[]): Promise<Staff[]>;
  findActiveTransportTask(bedId: string): Promise<TransportTask | null>;
  createTransportTask(input: Omit<TransportTask, "id" | "createdAt">, idempotencyKey: string): Promise<TransportTask>;
  getTransportTask(taskId: string): Promise<TransportTask | null>;
  transitionTask(taskId: string, from: TransportTask["status"][], to: TransportTask["status"], actorId?: string): Promise<TransportTask>;
  assignTask(taskId: string, staffId: string): Promise<TransportTask>;
  createDispatchAttempt(input: Omit<DispatchAttempt, "id">): Promise<DispatchAttempt>;
  completeDispatchAttempt(attemptId: string, response: DispatchResponse, providerCallId?: string): Promise<void>;
  appendEvent(event: OperationEvent): Promise<void>;
  listTaskEvents(taskId: string): Promise<OperationEvent[]>;
  getWardState(wardId: string): Promise<{ beds: BedState[]; tasks: TransportTask[] }>;
  notifyCoordinator(wardId: string, taskId: string, reason: string): Promise<void>;
}
