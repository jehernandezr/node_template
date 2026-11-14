import { CacheInvalidArgumentError } from './errors.js';

/** Options for {@link jitteredTtl}. */
export interface JitteredTtlOptions {
  /** Maximum relative deviation from the base, between 0 and 1. Defaults to 0.1. */
  ratio?: number;
  /** Source of randomness in [0, 1). Defaults to `Math.random`. */
  random?: () => number;
}

/**
 * Returns an integer TTL in milliseconds within `[base * (1 - ratio), base * (1 + ratio)]`.
 * Spreading expirations avoids many keys expiring at the same instant.
 */
export function jitteredTtl(
  baseMs: number,
  { ratio = 0.1, random = Math.random }: JitteredTtlOptions = {},
): number {
  if (!Number.isFinite(baseMs) || baseMs < 0) {
    throw new CacheInvalidArgumentError('baseMs', 'a finite number >= 0');
  }
  if (!(ratio >= 0 && ratio <= 1)) {
    throw new CacheInvalidArgumentError('ratio', 'a number between 0 and 1');
  }
  const low = Math.ceil(baseMs * (1 - ratio));
  const high = Math.floor(baseMs * (1 + ratio));
  if (low > high) {
    return Math.round(baseMs);
  }
  const span = high - low;
  // An injected source outside [0, 1) or NaN must not push the TTL out of bounds.
  const sample = random();
  const bounded = Number.isFinite(sample) && sample > 0 ? sample : 0;
  const offset = Math.min(Math.floor(bounded * (span + 1)), span);
  return low + offset;
}
