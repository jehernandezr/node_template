import { Clock } from './clock.js';

/** System clock. */
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
