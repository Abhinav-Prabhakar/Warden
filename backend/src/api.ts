import type { LocalCoordination } from "./local/coordination.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { WebhookReceiver } from "livekit-server-sdk";
import type { OperationsRepository } from "./ports/index.js";
import type { DispatchResponseBroker } from "./telephony/response-broker.js";
import { TransportWorkflow, WorkflowError } from "./workflow/transport-workflow.js";

const taskParams = z.object({ id: z.string().uuid() });
const wardParams = z.object({ id: z.string().uuid() });
const actorHeaders = z.object({ "x-staff-id": z.string().uuid(), "idempotency-key": z.string().min(8).optional() });
const createBody = z.object({
  bedId: z.string().min(1),
  destination: z.string().min(2).max(120),
  urgency: z.enum(["routine", "urgent"]).default("routine"),
  transportMode: z.enum(["wheelchair", "stretcher"]).default("wheelchair"),
});
const responseBody = z.object({
  callId: z.string().min(1),
  response: z.enum(["accepted", "rejected", "timeout", "failed"]),
});

export function buildApi(input: {
  local?: LocalCoordination;
  repository: OperationsRepository;
  workflow: TransportWorkflow;
  authToken: string;
  responseBroker?: DispatchResponseBroker;
  corsOrigin?: string;
  livekitWebhook?: { apiKey: string; apiSecret: string };
}) {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.x-staff-pin", "body.pin"] } });
  void app.register(cors, { origin: input.corsOrigin ?? false });
  app.addContentTypeParser("application/webhook+json", { parseAs: "string" }, (_request, body, done) => done(null, body));

  app.addHook("onRequest", async request => {
    if (request.url === "/health" || request.url === "/api/calls/livekit/webhook") return;
    if (request.headers.authorization !== `Bearer ${input.authToken}`) {
      throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    }
  });

  app.get("/health", async () => ({ ok: true, service: "warden-telephone-backend", mode: input.local ? "simulation" : "live", storage: input.local ? "memory; resets on restart" : "supabase; readiness not verified", telephony: input.local ? "manual simulation; no calls" : "livekit; readiness not verified" }));
  const local = () => { if (!input.local) throw Object.assign(new Error("Local test is disabled in live mode; authenticated production web integration is not ready."), { statusCode: 503 }); return input.local; };
  app.get("/api/local/state", async () => local().state());
  const turn = z.object({ sessionId: z.string().uuid(), revision: z.number().int().positive(), message: z.string().min(1).max(500) });
  app.post("/api/local/chat", async request => { const body = turn.parse(request.body); return local().command(body.sessionId, body.revision, body.message); });
  app.post("/api/local/interrupt", async request => { const body = turn.omit({ message: true }).parse(request.body); return local().interrupt(body.sessionId, body.revision); });
  app.post("/api/local/action", async request => {
    const body = z.object({ taskId: z.string().uuid(), staffId: z.string().uuid(), action: z.enum(["accept", "reject", "complete", "cancel", "ack_cancel"]) }).parse(request.body);
    return local().action(body.taskId, body.staffId, body.action);
  });
  app.addHook("onClose", async () => input.local?.close());
  app.get("/api/wards/:id/state", async request => input.repository.getWardState(wardParams.parse(request.params).id));
  app.get("/api/tasks/:id/events", async request => input.repository.listTaskEvents(taskParams.parse(request.params).id));

  app.post("/api/tasks", async request => {
    const headers = actorHeaders.parse(request.headers);
    if (input.local) throw Object.assign(new Error("Use /api/local/chat for the explicit simulation."), { statusCode: 409 });
    const body = createBody.parse(request.body);
    const idempotencyKey = headers["idempotency-key"];
    if (!idempotencyKey) throw Object.assign(new Error("Idempotency-Key is required"), { statusCode: 400 });
    return input.workflow.createAndDispatch({
      intent: { type: "CREATE_TRANSPORT", ...body },
      requestedBy: headers["x-staff-id"],
      idempotencyKey,
      operationId: randomUUID(),
      revision: 1,
    });
  });

  app.post("/api/tasks/:id/accept", async request => {
    const { id } = taskParams.parse(request.params);
    const actor = actorHeaders.parse(request.headers)["x-staff-id"];
    const task = await requiredTask(input.repository, id);
    if (task.assignedStaffId !== actor) throw Object.assign(new Error("Only the assigned transporter can accept this task"), { statusCode: 403 });
    return input.repository.transitionTask(id, ["assigned"], "accepted", actor);
  });

  app.post("/api/tasks/:id/reject", async request => {
    const { id } = taskParams.parse(request.params);
    const actor = actorHeaders.parse(request.headers)["x-staff-id"];
    const task = await requiredTask(input.repository, id);
    if (task.assignedStaffId !== actor) throw Object.assign(new Error("Only the assigned transporter can reject this task"), { statusCode: 403 });
    throw Object.assign(new Error("Rejection must be recorded during dispatch so Warden can call the next transporter"), { statusCode: 409 });
  });

  app.post("/api/tasks/:id/complete", async request => {
    const { id } = taskParams.parse(request.params);
    const actor = actorHeaders.parse(request.headers)["x-staff-id"];
    const task = await requiredTask(input.repository, id);
    if (task.assignedStaffId !== actor) throw Object.assign(new Error("Only the assigned transporter can complete this task"), { statusCode: 403 });
    return input.repository.transitionTask(id, ["accepted", "in_progress"], "completed", actor);
  });

  app.post("/api/tasks/:id/cancel", async request => {
    const { id } = taskParams.parse(request.params);
    const actor = actorHeaders.parse(request.headers)["x-staff-id"];
    return input.workflow.cancel(id, actor, randomUUID(), 1);
  });

  app.post("/api/dispatch/respond", async request => {
    if (!input.responseBroker) throw Object.assign(new Error("Dispatch response broker is unavailable"), { statusCode: 503 });
    const body = responseBody.parse(request.body);
    return { accepted: input.responseBroker.resolve(body.callId, body.response) };
  });

  app.post("/api/calls/livekit/webhook", async request => {
    if (!input.livekitWebhook) throw Object.assign(new Error("LiveKit webhook verification is unavailable"), { statusCode: 503 });
    const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
    const receiver = new WebhookReceiver(input.livekitWebhook.apiKey, input.livekitWebhook.apiSecret);
    const event = await receiver.receive(rawBody, request.headers.authorization);
    return { received: true, event: event.event };
  });

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof z.ZodError) return reply.status(400).send({ error: "INVALID_REQUEST", details: error.issues });
    if (error instanceof WorkflowError) return reply.status(409).send({ error: error.code, message: error.message });
    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    return reply.status(status).send({ error: status === 500 ? "INTERNAL_ERROR" : error.message });
  });
  return app;
}

async function requiredTask(repository: OperationsRepository, id: string) {
  const task = await repository.getTransportTask(id);
  if (!task) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  return task;
}
