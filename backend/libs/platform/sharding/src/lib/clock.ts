import type { Clock } from '@platform/kernel';

/** Epoch milliseconds from a kernel {@link Clock}. */
export function nowMs(clock: Clock): number {
  return clock.now().getTime();
}
