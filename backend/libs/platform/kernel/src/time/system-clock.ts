import { Clock } from './clock.js';

/** `Clock` over the process time, for production code. */
export class SystemClock extends Clock {
  override now(): Date {
    return new Date();
  }
}
