import { RandomSource } from '../../random/random-source.js';

/**
 * Fuente aleatoria determinista para pruebas. `next` recorre los valores dados
 * en círculo; `bytes` repite el byte `fill`.
 */
export class FixedRandomSource extends RandomSource {
  private index = 0;

  constructor(
    private readonly values: readonly number[] = [0.5],
    private readonly fill = 0,
  ) {
    super();
  }

  next(): number {
    const value = this.values[this.index % this.values.length];
    this.index += 1;
    return value;
  }

  bytes(length: number): Uint8Array {
    return new Uint8Array(length).fill(this.fill);
  }
}
