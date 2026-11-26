import { RandomSource } from '../../random/random-source.js';

/**
 * Deterministic random source for tests. `next` cycles through the given values
 * in a loop; `bytes` repeats the byte `fill`.
 */
export class FixedRandomSource extends RandomSource {
  private index = 0;

  constructor(
    private readonly values: readonly number[] = [0.5],
    private readonly fill = 0,
  ) {
    super();
  }

  override next(): number {
    const value = this.values[this.index % this.values.length];
    this.index += 1;
    return value;
  }

  override bytes(length: number): Uint8Array {
    return new Uint8Array(length).fill(this.fill);
  }
}
