/** Espera a que una condición asíncrona se cumpla, consultándola de nuevo hasta un tiempo máximo. */
export class Eventually {
  private static readonly POLL_MS = 20;

  static async until(
    condition: () => Promise<boolean>,
    timeoutMs: number,
  ): Promise<void> {
    const deadline = performance.now() + timeoutMs;
    while (!(await condition())) {
      if (performance.now() > deadline) {
        throw new Error('La condición no se cumplió a tiempo');
      }
      await new Promise((resolve) => setTimeout(resolve, Eventually.POLL_MS));
    }
  }
}
