/** Waits for an asynchronous condition to hold, polling it again up to a maximum time. */
export class Eventually {
  private static readonly POLL_MS = 20;

  static async until(
    condition: () => Promise<boolean>,
    timeoutMs: number,
  ): Promise<void> {
    const deadline = performance.now() + timeoutMs;
    while (!(await condition())) {
      if (performance.now() > deadline) {
        throw new Error('The condition was not met in time');
      }
      await new Promise((resolve) => setTimeout(resolve, Eventually.POLL_MS));
    }
  }
}
