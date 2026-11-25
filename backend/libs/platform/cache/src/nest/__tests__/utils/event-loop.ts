/** Lets the cache's background writes run, without depending on the clock. */
export class EventLoop {
  /** Yields to the event loop until the pending tasks drain. */
  static async drain(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}
