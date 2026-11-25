import type { RandomSource } from '@platform/kernel';
import { CacheInvalidArgumentError } from './errors/cache-invalid-argument.error.js';
import { CacheGuard } from './errors/cache-guard.js';

/**
 * Spreads expirations randomly around their base, so many
 * entries created at the same time do not expire at the same instant.
 */
export class TtlJitter {
  /** Default relative deviation (10 %). */
  static readonly DEFAULT_RATIO = 0.1;

  constructor(private readonly random: RandomSource) {}

  /**
   * Returns an integer TTL in milliseconds within `[base * (1 - ratio), base * (1 + ratio)]`.
   * @throws CacheInvalidArgumentError when `baseMs` or `ratio` are out of range.
   */
  jitter(baseMs: number, ratio: number = TtlJitter.DEFAULT_RATIO): number {
    CacheGuard.instance.nonNegativeFinite('baseMs', baseMs);
    if (!(ratio >= 0 && ratio <= 1)) {
      throw new CacheInvalidArgumentError('ratio', 'a number between 0 and 1');
    }
    const low = Math.ceil(baseMs * (1 - ratio));
    const high = Math.floor(baseMs * (1 + ratio));
    if (low > high) {
      return Math.round(baseMs);
    }
    const span = high - low;
    // A source outside [0, 1) or NaN must not push the TTL out of its bounds.
    const sample = this.random.next();
    const bounded = Number.isFinite(sample) && sample > 0 ? sample : 0;
    const offset = Math.min(Math.floor(bounded * (span + 1)), span);
    return low + offset;
  }
}
