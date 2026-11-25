/** Test loader that counts its calls in `calls` and can fail or stay pending. */
export class CountingLoader<T> {
  calls = 0;
  private error: Error | undefined;
  private gate: Promise<void> | undefined;

  constructor(private readonly value: T) {}

  /** Load function. It is an arrow property so it can be passed as `load` without losing `this`. */
  load = async (): Promise<T> => {
    this.calls += 1;
    if (this.gate !== undefined) {
      await this.gate;
    }
    if (this.error !== undefined) {
      throw this.error;
    }
    return this.value;
  };

  /** Makes every subsequent load reject with `error`. */
  failWith(error: Error): void {
    this.error = error;
  }

  /** Leaves the next load pending until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.gate = new Promise<void>((resolve) => {
      release = (): void => resolve();
    });
    return () => release();
  }
}
