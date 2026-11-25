/** Promise that the test resolves whenever it wants. */
export class Deferred<T> {
  readonly promise: Promise<T>;
  private settle: ((value: T) => void) | undefined;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.settle = resolve;
    });
  }

  resolve(value: T): void {
    this.settle?.(value);
  }
}
