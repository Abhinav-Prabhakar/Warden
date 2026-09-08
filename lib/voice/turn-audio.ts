export class TurnAudio {
  private revision = 0;
  private currentController = new AbortController();
  private stopCallbacks = new Map<number, (() => void)[]>();

  get controller(): AbortController {
    return this.currentController;
  }

  next(): number {
    this.currentController.abort();
    const callbacks = this.stopCallbacks.get(this.revision) || [];
    for (const cb of callbacks) {
      cb();
    }
    this.stopCallbacks.delete(this.revision);

    this.revision += 1;
    this.currentController = new AbortController();
    this.stopCallbacks.set(this.revision, []);
    return this.revision;
  }

  current(revision: number): boolean {
    return this.revision === revision && !this.currentController.signal.aborted;
  }

  attach(revision: number, stopFn: () => void): boolean {
    if (!this.current(revision)) {
      stopFn();
      return false;
    }
    const list = this.stopCallbacks.get(revision) || [];
    list.push(stopFn);
    this.stopCallbacks.set(revision, list);
    return true;
  }
}
