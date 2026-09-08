import "dotenv/config";
import { fileURLToPath } from "node:url";
import { cli, defineAgent, llm, voice, ServerOptions } from "@livekit/agents";
import { z } from "zod";
import { RoomEvent } from "@livekit/rtc-node";
import { loadConfig } from "./config.js";
import { SupabaseOperationsRepository } from "./adapters/supabase-repository.js";

type JobMetadata = { kind?: string; taskId?: string; prompt?: string; callId?: string };

export default defineAgent({
  entry: async ctx => {
    const config = loadConfig();
    if (config.WARDEN_MODE !== "live") throw new Error("Telephone agent requires WARDEN_MODE=live and real provider credentials; use the web test for simulation.");
    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    const metadata = parseMetadata(ctx.job.metadata);
    const phone = participant.attributes["sip.phoneNumber"] ?? "";

    if (metadata.kind === "transport-dispatch") {
      const tools = {
        recordResponse: llm.tool({
          description: "Record the transporter's explicit acceptance or rejection. Call only after they clearly answer.",
          parameters: z.object({ response: z.enum(["accepted", "rejected"]) }),
          execute: async ({ response }) => {
            const callId = metadata.callId ?? participant.identity;
            await backendRequest(config.BACKEND_BASE_URL, config.API_AUTH_TOKEN, "/api/dispatch/respond", { callId, response });
            return { recorded: true, response };
          },
        }),
      };
      const session = createSession(config, tools);
      ctx.room.on(RoomEvent.DtmfReceived, (_code, digit) => {
        const response = digit === "1" ? "accepted" : digit === "2" ? "rejected" : undefined;
        if (response) void backendRequest(config.BACKEND_BASE_URL, config.API_AUTH_TOKEN, "/api/dispatch/respond", {
          callId: metadata.callId ?? participant.identity, response,
        });
      });
      await session.start({
        room: ctx.room,
        agent: createAgent(
          config,
          "You are Warden calling a hospital porter. Read the assignment exactly. Ask them to say accept or reject, or press 1 or 2. Map 1 to accepted and 2 to rejected. Always call recordResponse after an explicit answer. Do not claim acceptance before the tool succeeds.",
          tools,
        ),
      });
      await session.say(metadata.prompt ?? "A transport request is waiting. Say accept or reject, or press 1 or 2.");
      return;
    }

    const repository = new SupabaseOperationsRepository(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    let verifiedStaffId: string | undefined;
    const tools = {
      verifyCaller: llm.tool({
        description: "Verify the nurse using the caller phone number and spoken PIN before any hospital operation.",
        parameters: z.object({ pin: z.string().regex(/^\d{4,8}$/) }),
        execute: async ({ pin }) => {
          verifiedStaffId = undefined;
          const caller = await repository.getCaller(phone);
          if (!caller || caller.role !== "nurse" || !caller.onDuty || !(await repository.verifyPin(caller.id, pin))) return { verified: false };
          verifiedStaffId = caller.id;
          return { verified: true, staffId: caller.id, name: caller.name };
        },
      }),
      createTransport: llm.tool({
        description: "Create and immediately dispatch a confirmed patient transport request. Caller verification is mandatory.",
        parameters: z.object({
          bedId: z.string().min(1), destination: z.string().min(2),
          urgency: z.enum(["routine", "urgent"]), transportMode: z.enum(["wheelchair", "stretcher"]),
          confirmed: z.literal(true),
        }),
        execute: async request => {
          if (!verifiedStaffId) return { created: false, error: "CALLER_NOT_VERIFIED" };
          return backendRequest(config.BACKEND_BASE_URL, config.API_AUTH_TOKEN, "/api/tasks", request, {
            "x-staff-id": verifiedStaffId, "idempotency-key": crypto.randomUUID(),
          });
        },
      }),
    };
    const session = createSession(config, tools);
    await session.start({
      room: ctx.room,
      agent: createAgent(
        config,
        "You are Warden, a concise hospital transport coordinator. First verify the caller with verifyCaller. Collect bed, destination, urgency and wheelchair or stretcher. Repeat the request and ask for confirmation. Only then call createTransport. Report created, contacted and accepted states precisely from tool results. Never invent patient or task status.",
        tools,
      ),
    });
    await session.say("Warden speaking. Please say your PIN to verify your identity.");
  },
});

function getTTSModelString(config: ReturnType<typeof loadConfig>): string {
  if (config.TTS_PROVIDER === "fish-audio") {
    const model = config.TTS_MODEL.startsWith("fish-audio/")
      ? config.TTS_MODEL
      : `fish-audio/${config.TTS_MODEL || "s2.1-pro-free"}`;
    return config.TTS_VOICE && config.TTS_VOICE !== "default"
      ? `${model}:${config.TTS_VOICE}`
      : model;
  }
  if (config.TTS_PROVIDER === "rime") {
    const model = config.TTS_MODEL.startsWith("rime/")
      ? config.TTS_MODEL
      : `rime/${config.TTS_MODEL || "mistv2"}`;
    return `${model}:${config.TTS_VOICE || "abbie"}`;
  }
  return `${config.TTS_MODEL}:${config.TTS_VOICE}`;
}

function createAgent(
  config: ReturnType<typeof loadConfig>,
  instructions: string,
  tools: Record<string, ReturnType<typeof llm.tool>>,
) {
  const agent = new voice.Agent({
    instructions,
    tools,
  });

  // Waterfall mode: buffer LLM tokens until stream completion, then synthesize complete text.
  // Stream mode (default): LiveKit streams tokens directly into TTS synthesis in real-time.
  if (config.TTS_MODE === "waterfall") {
    const origTtsNode = agent.ttsNode.bind(agent);
    agent.ttsNode = async (text, modelSettings) => {
      if (text && typeof text === "object" && typeof (text as any).getReader === "function") {
        const reader = (text as ReadableStream<string>).getReader();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (typeof value === "string") fullText += value;
        }
        const waterfallStream = new ReadableStream<string>({
          start(controller) {
            controller.enqueue(fullText);
            controller.close();
          },
        });
        return origTtsNode(waterfallStream, modelSettings);
      }
      return origTtsNode(text, modelSettings);
    };
  }

  return agent;
}

function createSession(config: ReturnType<typeof loadConfig>, tools: Record<string, ReturnType<typeof llm.tool>>) {
  return new voice.AgentSession({
    stt: config.STT_MODEL as never,
    llm: config.LLM_MODEL as never,
    tts: getTTSModelString(config) as never,
    tools,
    turnHandling: { interruption: { enabled: true } },
  });
}

function parseMetadata(raw: string): JobMetadata {
  try { return raw ? JSON.parse(raw) as JobMetadata : {}; } catch { return {}; }
}

async function backendRequest(baseUrl: string, token: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const result = await response.json() as unknown;
  if (!response.ok) throw new Error(`Warden backend request failed with status ${response.status}`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  cli.runApp(new ServerOptions({ agent: import.meta.filename, agentName: config.WARDEN_AGENT_NAME }));
}
