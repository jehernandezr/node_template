/**
 * Source of randomness. Injecting it makes jittered waits, sampling and
 * identifier generation deterministic in tests.
 */
export abstract class RandomSource {
  /**
   * Uniform value in `[0, 1)`.
   * @returns The value.
   */
  abstract next(): number;

  /**
   * Random bytes of the given length.
   * @param length Number of bytes.
   * @returns The bytes.
   */
  abstract bytes(length: number): Uint8Array;
}
