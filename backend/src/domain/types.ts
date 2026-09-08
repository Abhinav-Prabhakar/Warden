export type StaffRole = "nurse" | "transporter" | "coordinator";
export type Availability = "available" | "busy" | "off_duty";
export type TransportMode = "wheelchair" | "stretcher";
export type Urgency = "routine" | "urgent";

export type TaskStatus =
  | "requested"
  | "dispatching"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancellation_requested"
  | "cancelled"
  | "failed";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  pinHash: string;
  onDuty: boolean;
  availability: Availability;
  currentZone: string;
  skills: string[];
  activeTaskCount: number;
}

export interface BedState {
  id: string;
  label: string;
  wardId: string;
  zone: string;
  status: "available" | "occupied" | "cleaning" | "maintenance";
  patientId?: string;
  patientReadyForTransport: boolean;
}

export interface TransportIntent {
  type: "CREATE_TRANSPORT";
  bedId: string;
  destination: string;
  urgency: Urgency;
  transportMode?: TransportMode;
}

export interface TransportTask {
  id: string;
  patientId: string;
  bedId: string;
  wardId: string;
  originZone: string;
  destination: string;
  urgency: Urgency;
  transportMode: TransportMode;
  requestedBy: string;
  assignedStaffId?: string;
  status: TaskStatus;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export type DispatchResponse = "accepted" | "rejected" | "timeout" | "failed";

export interface DispatchAttempt {
  id: string;
  taskId: string;
  staffId: string;
  attemptNumber: number;
  providerCallId?: string;
  response?: DispatchResponse;
  responseDeadline: Date;
}

export interface OperationEvent {
  id?: string;
  taskId?: string;
  callSessionId?: string;
  operationId: string;
  revision: number;
  type: string;
  actorId?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface CallSession {
  id: string;
  providerCallId: string;
  roomName: string;
  direction: "inbound" | "outbound";
  remotePhone: string;
}

export interface IncomingCall {
  providerCallId: string;
  roomName: string;
  from: string;
  to: string;
}

export interface OutboundCallRequest {
  phone: string;
  roomName: string;
  participantIdentity: string;
  taskId: string;
  prompt: string;
  timeoutMs: number;
}

export interface AudioChunk {
  data: Uint8Array;
  sampleRate: number;
  encoding: "pcm" | "mp3";
}

export interface AgentInput {
  text: string;
  operationId: string;
  revision: number;
}

export type StructuredIntent =
  | TransportIntent
  | { type: "CANCEL_TRANSPORT"; taskId?: string; bedId?: string }
  | { type: "GET_STATUS"; taskId?: string; bedId?: string }
  | { type: "UNKNOWN"; reason: string };
