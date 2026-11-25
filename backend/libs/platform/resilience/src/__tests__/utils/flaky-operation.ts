/**
 * Test operation that fails the first `failures` times and then
 * returns `value`. Counts its calls in `calls`.
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
