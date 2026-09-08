import type { AudioChunk } from "../domain/types.js";
import type { TextToSpeechProvider } from "../ports/index.js";

export class FishAudioTTSAdapter implements TextToSpeechProvider {
  readonly name = "fish-audio";
  readonly model: string;
  readonly voice: string;
  private readonly apiKey?: string;
  private readonly mode: "stream" | "waterfall";
  private readonly activeRequests = new Map<string, AbortController>();

  constructor(options: {
    model?: string;
    voice?: string;
    apiKey?: string;
    mode?: "stream" | "waterfall";
  } = {}) {
    this.model = options.model ?? "s2.1-pro-free";
    this.voice = options.voice ?? "default";
    this.apiKey = options.apiKey || process.env.FISH_AUDIO_API_KEY;
    this.mode = options.mode ?? "stream";
  }

  async *stream(text: string, options: { synthesisId: string; signal?: AbortSignal }): AsyncIterable<AudioChunk> {
    const controller = new AbortController();
    this.activeRequests.set(options.synthesisId, controller);
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort("turn_aborted"), { once: true });
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        model: this.model,
      };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          format: "mp3",
          latency: "low",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Fish Audio TTS failed (${res.status}): ${err}`);
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          yield {
            data: value,
            sampleRate: 24_000,
            encoding: "mp3",
          };
        }
      }
    } finally {
      this.activeRequests.delete(options.synthesisId);
    }
  }

  async cancel(synthesisId: string): Promise<void> {
    const controller = this.activeRequests.get(synthesisId);
    if (controller) {
      controller.abort("cancelled");
      this.activeRequests.delete(synthesisId);
    }
  }
}

export class RimeTTSAdapter implements TextToSpeechProvider {
  readonly name = "rime";
  readonly model: string;
  readonly voice: string;
  private readonly apiKey: string;
  private readonly mode: "stream" | "waterfall";
  private readonly activeRequests = new Map<string, AbortController>();

  constructor(options: {
    model?: string;
    voice?: string;
    apiKey?: string;
    mode?: "stream" | "waterfall";
  } = {}) {
    this.model = options.model ?? "mistv2";
    this.voice = options.voice ?? "abbie";
    this.apiKey = options.apiKey || process.env.RIME_API_KEY || "";
    this.mode = options.mode ?? "stream";
  }

  async *stream(text: string, options: { synthesisId: string; signal?: AbortSignal }): AsyncIterable<AudioChunk> {
    const controller = new AbortController();
    this.activeRequests.set(options.synthesisId, controller);
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort("turn_aborted"), { once: true });
    }

    try {
      const res = await fetch("https://users.rime.ai/v1/rime-tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "audio/mp3",
        },
        body: JSON.stringify({
          text,
          speaker: this.voice,
          modelId: this.model,
          speedAlpha: 1.0,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Rime TTS failed (${res.status}): ${err}`);
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          yield {
            data: value,
            sampleRate: 22_050,
            encoding: "mp3",
          };
        }
      }
    } finally {
      this.activeRequests.delete(options.synthesisId);
    }
  }

  async cancel(synthesisId: string): Promise<void> {
    const controller = this.activeRequests.get(synthesisId);
    if (controller) {
      controller.abort("cancelled");
      this.activeRequests.delete(synthesisId);
    }
  }
}
