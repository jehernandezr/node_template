/** Promesa que se resuelve o rechaza desde afuera, para controlar el orden de las operaciones en una prueba. */
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
