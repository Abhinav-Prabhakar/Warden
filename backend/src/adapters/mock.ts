import { randomUUID } from "node:crypto";
import type { AudioChunk, CallSession, DispatchResponse, IncomingCall, OutboundCallRequest } from "../domain/types.js";
import type { TelephonyProvider, TextToSpeechProvider } from "../ports/index.js";

export class ScriptedTelephonyAdapter implements TelephonyProvider {
  readonly calls: OutboundCallRequest[] = [];
  readonly hungUp: string[] = [];
  constructor(private readonly responses: DispatchResponse[] = ["accepted"]) {}
  async answerCall(call: IncomingCall): Promise<CallSession> { return { id: call.providerCallId, providerCallId: call.providerCallId, roomName: call.roomName, direction: "inbound", remotePhone: call.from }; }
  async dial(request: OutboundCallRequest): Promise<CallSession> { this.calls.push(request); const id = randomUUID(); return { id, providerCallId: id, roomName: request.roomName, direction: "outbound", remotePhone: request.phone }; }
  async waitForResponse(_callId: string, _timeoutMs: number, signal?: AbortSignal): Promise<DispatchResponse> { if (signal?.aborted) throw signal.reason; return this.responses.shift() ?? "timeout"; }
  async hangup(callId: string) { this.hungUp.push(callId); }
  async sendDtmf() {}
}

export class MockTTSAdapter implements TextToSpeechProvider {
  readonly name = "mock";
  readonly model = "mock";
  readonly voice = "mock";
  readonly cancelled: string[] = [];
  async *stream(text: string, options: { synthesisId: string; signal?: AbortSignal }): AsyncIterable<AudioChunk> {
    if (!options.signal?.aborted) yield { data: new TextEncoder().encode(text), sampleRate: 16_000, encoding: "pcm" };
  }
  async cancel(id: string) { this.cancelled.push(id); }
}
