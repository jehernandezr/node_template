import type { Clock } from '@platform/kernel';

/** Options of `InMemoryCache`. */
export interface InMemoryCacheOptions {
  /** Time source for expirations. In tests, `FixedClock` from `@platform/kernel/test-utils`. */
  readonly clock: Clock;
}
