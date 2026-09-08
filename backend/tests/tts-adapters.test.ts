import { describe, it, expect } from "vitest";
import { FishAudioTTSAdapter, RimeTTSAdapter } from "../src/adapters/tts.js";

describe("TTS Adapters (Fish Audio & Rime)", () => {
  it("Fish Audio adapter initializes with s2.1-pro-free by default", () => {
    const adapter = new FishAudioTTSAdapter();
    expect(adapter.name).toBe("fish-audio");
    expect(adapter.model).toBe("s2.1-pro-free");
    expect(adapter.voice).toBe("default");
  });

  it("Rime adapter initializes with mistv2 and abbie by default", () => {
    const adapter = new RimeTTSAdapter();
    expect(adapter.name).toBe("rime");
    expect(adapter.model).toBe("mistv2");
    expect(adapter.voice).toBe("abbie");
  });

  it("Fish Audio adapter supports cancel", async () => {
    const adapter = new FishAudioTTSAdapter();
    await expect(adapter.cancel("test-id")).resolves.toBeUndefined();
  });

  it("Rime adapter supports cancel", async () => {
    const adapter = new RimeTTSAdapter();
    await expect(adapter.cancel("test-id")).resolves.toBeUndefined();
  });
});
