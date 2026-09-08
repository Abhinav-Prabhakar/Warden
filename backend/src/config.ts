import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WARDEN_MODE: z.enum(["simulation", "live"]).default("live"),
  LOCAL_LOOKUP_MS: z.coerce.number().int().min(0).max(10000).default(2500),
  PORT: z.coerce.number().int().positive().default(3100),
  API_AUTH_TOKEN: z.string().min(12),
  CORS_ORIGIN: z.string().url().optional(),
  BACKEND_BASE_URL: z.string().url().default("http://127.0.0.1:3100"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LIVEKIT_URL: z.string().min(1).optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_SIP_OUTBOUND_TRUNK_ID: z.string().startsWith("ST_").optional(),
  WARDEN_AGENT_NAME: z.string().default("warden-telephone"),
  STT_PROVIDER: z.enum(["livekit-inference", "mock"]).default("livekit-inference"),
  STT_MODEL: z.string().default("deepgram/nova-3:en"),
  LLM_PROVIDER: z.enum(["livekit-inference", "mock"]).default("livekit-inference"),
  LLM_MODEL: z.string().default("groq/gpt-oss-120b"),
  TTS_PROVIDER: z.enum(["rime", "mock"]).default("rime"),
  TTS_MODEL: z.enum(["rime/coda", "rime/mist", "rime/mistv2", "rime/mistv3"]).default("rime/mistv2"),
  TTS_VOICE: z.string().min(1).default("abbie"),
  DISPATCH_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(20_000),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")}`);
  }
  const value = result.data;
  if (value.WARDEN_MODE === "live") {
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_SIP_OUTBOUND_TRUNK_ID"] as const;
    const missing = required.filter(k => !value[k]);
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(", ")}`);
    if (value.TTS_PROVIDER !== "rime") throw new Error("The judged production path must use Rime TTS.");
  }
  return value;
}
