import { stableDigest } from '@platform/primitives';

/**
 * SHA-256 of the canonical JSON of an input. `undefined` hashes as `null`.
 * @deprecated Use `stableDigest` from `@platform/primitives`, which is also
 * safe for `__proto__` keys and rejects values that are not JSON.
 */
export function hashInput(input: unknown): string {
  return stableDigest(input === undefined ? null : input);
}
