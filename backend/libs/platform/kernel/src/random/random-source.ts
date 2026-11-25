/**
 * Source of randomness. Injecting it makes jittered waits, sampling and
 * identifier generation deterministic in tests.
 */
export abstract class RandomSource {
  /** Uniform value in `[0, 1)`. */
  abstract next(): number;

  /** `length` bytes aleatorios. */
  abstract bytes(length: number): Uint8Array;
}
