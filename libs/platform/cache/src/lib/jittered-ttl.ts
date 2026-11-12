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
    throw new RangeError('baseMs must be a non-negative finite number');
  }
  if (!(ratio >= 0 && ratio <= 1)) {
    throw new RangeError('ratio must be between 0 and 1');
  }
  const low = Math.ceil(baseMs * (1 - ratio));
  const high = Math.floor(baseMs * (1 + ratio));
  if (low > high) {
    return Math.round(baseMs);
  }
  const span = high - low;
  const offset = Math.min(Math.floor(random() * (span + 1)), span);
  return low + offset;
}
