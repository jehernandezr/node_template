import { Clock } from './clock.js';

/** System clock. */
export class SystemClock extends Clock {
  override now(): Date {
    return new Date();
  }
}
