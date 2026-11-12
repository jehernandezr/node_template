import { InvalidParameters } from './bloom-error.js';

/** Smallest allowed bit array size. */
export const MIN_BITS = 1;
/** Largest allowed bit array size (2^32 bits). */
export const MAX_BITS = 2 ** 32;
/** Smallest allowed hash count. */
export const MIN_HASHES = 1;
/** Largest allowed hash count. */
export const MAX_HASHES = 32;

/**
 * Asserts that `value` is a safe integer within `[min, max]`.
 * @throws {InvalidParameters} otherwise.
 */
export function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new InvalidParameters(
      `${name} must be an integer in [${min}, ${max}], got ${value}`,
    );
  }
}
