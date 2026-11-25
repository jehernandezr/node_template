import type { Clock } from '@platform/kernel';

/** One-minute windows: the start of the current window and the limit of those that can already be sent. */
export class UsageWindowClock {
  static readonly WINDOW_MS = 60_000;

  constructor(private readonly clock: Clock) {}

  current(): Date {
    const now = this.clock.now().getTime();
    return new Date(now - (now % UsageWindowClock.WINDOW_MS));
  }

  /**
   * The windows before the one preceding the current one: the preceding one can still receive what an
   * instance with a slightly late clock counts.
   */
  closedBefore(): Date {
    return new Date(this.current().getTime() - UsageWindowClock.WINDOW_MS);
  }
}
