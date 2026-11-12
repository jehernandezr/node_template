import { SystemClock, type Clock } from '@platform/kernel';

/**
 * Time source accepted by the sharding lib: the kernel {@link Clock}, or (deprecated) a function that
 * returns epoch milliseconds. The function form goes away in WP-A phase 2.
 */
export type ShardingClock = Clock | (() => number);

/** The kernel {@link Clock} behind a {@link ShardingClock}. Defaults to the system clock. */
export function toClock(clock: ShardingClock | undefined): Clock {
  if (clock === undefined) {
    return new SystemClock();
  }
  if (typeof clock === 'function') {
    return { now: () => new Date(clock()) };
  }
  return clock;
}

/** Epoch milliseconds from a kernel {@link Clock}. */
export function nowMs(clock: Clock): number {
  return clock.now().getTime();
}
