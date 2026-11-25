/** Waits for a condition with bounded polling, instead of sleeping a fixed time. */
export class PollUntil {
  static readonly DEFAULT_TIMEOUT_MS = 5_000;
  private static readonly INTERVAL_MS = 10;

  static async run(
    check: () => boolean | Promise<boolean>,
    timeoutMs = PollUntil.DEFAULT_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!(await check())) {
      if (Date.now() > deadline) {
        throw new Error(`condition not met within ${timeoutMs} ms`);
      }
      await new Promise<void>((resolve) =>
        setTimeout(resolve, PollUntil.INTERVAL_MS),
      );
    }
  }
}
