const POLL_TIMEOUT_MS = 1000;

/** Waits for a condition to hold, with real timers. */
export class Eventually {
  static async until(
    condition: () => boolean,
    timeoutMs = POLL_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = performance.now() + timeoutMs;
    while (!condition()) {
      if (performance.now() > deadline) {
        throw new Error('condition not met');
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}
