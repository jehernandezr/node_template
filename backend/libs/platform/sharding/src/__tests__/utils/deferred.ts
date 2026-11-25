/** Promise that is resolved or rejected from outside, to control the order of operations in a test. */
export class Deferred<T> {
  readonly promise: Promise<T>;
  private resolver!: (value: T) => void;
  private rejecter!: (reason: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;
    });
  }

  resolve(value: T): void {
    this.resolver(value);
  }

  reject(reason: unknown): void {
    this.rejecter(reason);
  }
}
