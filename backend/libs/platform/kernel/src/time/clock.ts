/** Fuente de tiempo. Inyectarla permite controlar el tiempo en las pruebas. */
export abstract class Clock {
  abstract now(): Date;
}
