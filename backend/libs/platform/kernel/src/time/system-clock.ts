import { Clock } from './clock.js';

/** Reloj del sistema. */
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
