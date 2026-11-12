/** Fuente de tiempo. Inyectarla permite controlar el tiempo en los tests. */
export interface Clock {
  now(): Date;
}

/** Reloj del sistema. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
