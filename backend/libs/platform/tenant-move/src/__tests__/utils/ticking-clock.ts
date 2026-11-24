import type { Clock } from '@platform/kernel';

/** Un reloj que avanza un milisegundo cada vez que se consulta: el plazo de una llamada se mide en consultas. */
export class TickingClock implements Clock {
  private current = Date.UTC(2026, 10, 1);

  now(): Date {
    this.current += 1;
    return new Date(this.current);
  }
}
