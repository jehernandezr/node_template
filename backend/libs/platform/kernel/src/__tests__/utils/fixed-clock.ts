import type { Clock } from '../../time/clock.js';

/** Test clock with a fixed time that can be changed and advanced. */
export class FixedClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date('2025-01-01T00:00:00.000Z')) {
    this.current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  /** Sets a new time. */
  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  /** Advances the time by the given milliseconds. */
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
