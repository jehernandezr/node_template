import type { Clock } from '@platform/kernel';

/** A clock that advances one millisecond each time it is read: a call's deadline is measured in reads. */
export class TickingClock implements Clock {
  private current = Date.UTC(2026, 10, 1);

  now(): Date {
    this.current += 1;
    return new Date(this.current);
  }
}
