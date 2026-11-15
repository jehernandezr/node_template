const POLL_TIMEOUT_MS = 1000;

/** Espera a que una condición se cumpla con temporizadores reales. */
export class Eventually {
  static async until(
    condition: () => boolean,
    timeoutMs = POLL_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = performance.now() + timeoutMs;
    while (!condition()) {
      if (performance.now() > deadline) {
        throw new Error('condición no cumplida');
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}
