import { describe, expect, it, vi } from "vitest";
import { DispatchResponseBroker } from "../src/telephony/response-broker.js";

describe("dispatch response broker", () => {
  it("delivers an acceptance received while a call is waiting", async () => {
    const broker = new DispatchResponseBroker();
    const waiting = broker.wait("call-1", 1000);
    expect(broker.resolve("call-1", "accepted")).toBe(true);
    await expect(waiting).resolves.toBe("accepted");
  });

  it("keeps a response that arrives before the workflow starts waiting", async () => {
    const broker = new DispatchResponseBroker();
    expect(broker.resolve("call-2", "rejected")).toBe(false);
    await expect(broker.wait("call-2", 1000)).resolves.toBe("rejected");
  });

  it("times out without a response", async () => {
    vi.useFakeTimers();
    const broker = new DispatchResponseBroker();
    const waiting = broker.wait("call-3", 20);
    await vi.advanceTimersByTimeAsync(20);
    await expect(waiting).resolves.toBe("timeout");
    vi.useRealTimers();
  });
});
