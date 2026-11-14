import type { Clock } from '../clock.js';

/** Reloj de test con hora fija que se puede cambiar y adelantar. */
export class FixedClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date('2025-01-01T00:00:00.000Z')) {
    this.current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  /** Fija una hora nueva. */
  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  /** Avanza la hora los milisegundos indicados. */
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
