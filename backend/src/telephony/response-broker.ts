import type { DispatchResponse } from "../domain/types.js";

type Pending = {
  resolve: (response: DispatchResponse) => void;
  timer: NodeJS.Timeout;
  signal?: AbortSignal;
  onAbort?: () => void;
};

export class DispatchResponseBroker {
  private readonly pending = new Map<string, Pending>();
  private readonly early = new Map<string, DispatchResponse>();

  wait(callId: string, timeoutMs: number, signal?: AbortSignal): Promise<DispatchResponse> {
    const early = this.early.get(callId);
    if (early) {
      this.early.delete(callId);
      return Promise.resolve(early);
    }
    return new Promise(resolve => {
      const finish = (response: DispatchResponse) => {
        const item = this.pending.get(callId);
        if (!item) return;
        clearTimeout(item.timer);
        if (item.onAbort) item.signal?.removeEventListener("abort", item.onAbort);
        this.pending.delete(callId);
        resolve(response);
      };
      const timer = setTimeout(() => finish("timeout"), timeoutMs);
      const item: Pending = { resolve: finish, timer, signal };
      if (signal) {
        item.onAbort = () => finish("failed");
        signal.addEventListener("abort", item.onAbort, { once: true });
      }
      this.pending.set(callId, item);
    });
  }

  resolve(callId: string, response: DispatchResponse): boolean {
    const item = this.pending.get(callId);
    if (item) {
      item.resolve(response);
      return true;
    }
    this.early.set(callId, response);
    return false;
  }
}

export const dispatchResponseBroker = new DispatchResponseBroker();
