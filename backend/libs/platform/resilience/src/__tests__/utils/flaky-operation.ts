/**
 * Operación de prueba que falla las primeras `failures` veces y después
 * responde `value`. Cuenta sus llamadas en `calls`.
 */
export class FlakyOperation<T> {
  calls = 0;

  constructor(
    private readonly failures: number,
    private readonly failure: () => Error,
    private readonly value: T,
  ) {}

  run(): Promise<T> {
    this.calls += 1;
    if (this.calls <= this.failures) {
      return Promise.reject(this.failure());
    }
    return Promise.resolve(this.value);
  }
}
