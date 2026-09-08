import "dotenv/config";
import { buildApi } from "./api.js";
import { loadConfig } from "./config.js";
import { InMemoryOperationsRepository } from "./adapters/in-memory-repository.js";
import { ScriptedTelephonyAdapter } from "./adapters/mock.js";
import { SupabaseOperationsRepository } from "./adapters/supabase-repository.js";
import { LiveKitTelephonyAdapter } from "./adapters/livekit-telephony.js";
import { TransportWorkflow } from "./workflow/transport-workflow.js";
import { dispatchResponseBroker } from "./telephony/response-broker.js";
import type { OperationsRepository } from "./ports/index.js";
import { LocalCoordination, seedLocal } from "./local/coordination.js";

const config = loadConfig();
const production = config.WARDEN_MODE === "live";
let repository: OperationsRepository;
if (production) {
  repository = new SupabaseOperationsRepository(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
} else {
  const memory = new InMemoryOperationsRepository();
  seedLocal(memory);
  repository = memory;
}
const telephony = production
  ? new LiveKitTelephonyAdapter(config.LIVEKIT_URL!, config.LIVEKIT_API_KEY!, config.LIVEKIT_API_SECRET!, config.LIVEKIT_SIP_OUTBOUND_TRUNK_ID!, config.WARDEN_AGENT_NAME, dispatchResponseBroker.wait.bind(dispatchResponseBroker))
  : new ScriptedTelephonyAdapter();
const workflow = new TransportWorkflow(repository, telephony, config.DISPATCH_TIMEOUT_MS);
const app = buildApi({
  local: repository instanceof InMemoryOperationsRepository ? new LocalCoordination(repository, config.LOCAL_LOOKUP_MS, config.DISPATCH_TIMEOUT_MS) : undefined,
  repository,
  workflow,
  authToken: config.API_AUTH_TOKEN,
  responseBroker: dispatchResponseBroker,
  corsOrigin: config.CORS_ORIGIN,
  livekitWebhook: production ? { apiKey: config.LIVEKIT_API_KEY!, apiSecret: config.LIVEKIT_API_SECRET! } : undefined,
});

await app.listen({ port: config.PORT, host: production ? "0.0.0.0" : "127.0.0.1" });
