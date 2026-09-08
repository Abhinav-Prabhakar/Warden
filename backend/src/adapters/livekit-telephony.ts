import { AgentDispatchClient, RoomServiceClient, SipClient } from "livekit-server-sdk";
import type { CallSession, DispatchResponse, IncomingCall, OutboundCallRequest } from "../domain/types.js";
import type { TelephonyProvider } from "../ports/index.js";

type ResponseWaiter = (callId: string, timeoutMs: number, signal?: AbortSignal) => Promise<DispatchResponse>;

export class LiveKitTelephonyAdapter implements TelephonyProvider {
  private readonly sip: SipClient;
  private readonly dispatch: AgentDispatchClient;
  private readonly rooms: RoomServiceClient;
  private readonly participants = new Map<string, { roomName: string; identity: string }>();

  constructor(
    host: string,
    apiKey: string,
    apiSecret: string,
    private readonly outboundTrunkId: string,
    private readonly agentName: string,
    private readonly responseWaiter: ResponseWaiter,
  ) {
    const httpHost = host.replace(/^wss:/, "https:");
    this.sip = new SipClient(httpHost, apiKey, apiSecret);
    this.dispatch = new AgentDispatchClient(httpHost, apiKey, apiSecret);
    this.rooms = new RoomServiceClient(httpHost, apiKey, apiSecret);
  }

  async answerCall(call: IncomingCall): Promise<CallSession> {
    return { id: call.providerCallId, providerCallId: call.providerCallId, roomName: call.roomName, direction: "inbound", remotePhone: call.from };
  }

  async dial(request: OutboundCallRequest): Promise<CallSession> {
    await this.dispatch.createDispatch(request.roomName, this.agentName, {
      metadata: JSON.stringify({ kind: "transport-dispatch", taskId: request.taskId, prompt: request.prompt, callId: request.participantIdentity }),
    });
    const participant = await this.sip.createSipParticipant(
      this.outboundTrunkId,
      request.phone,
      request.roomName,
      {
        participantIdentity: request.participantIdentity,
        participantName: "Warden transport request",
        waitUntilAnswered: true,
        playDialtone: true,
      },
    );
    const id = participant.participantIdentity;
    this.participants.set(id, { roomName: request.roomName, identity: participant.participantIdentity });
    return {
      id,
      providerCallId: participant.sipCallId,
      roomName: request.roomName,
      direction: "outbound",
      remotePhone: request.phone,
    };
  }

  waitForResponse(callId: string, timeoutMs: number, signal?: AbortSignal) {
    return this.responseWaiter(callId, timeoutMs, signal);
  }

  async hangup(callId: string): Promise<void> {
    const participant = this.participants.get(callId);
    if (!participant) return;
    await this.rooms.removeParticipant(participant.roomName, participant.identity);
    this.participants.delete(callId);
  }

  async sendDtmf(): Promise<void> {
    throw new Error("Outbound DTMF must be sent by the active LiveKit room participant.");
  }
}
