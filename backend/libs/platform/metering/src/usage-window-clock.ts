import type { Clock } from '@platform/kernel';

/** Ventanas de un minuto: el inicio de la ventana actual y el límite de las que ya se pueden enviar. */
export class UsageWindowClock {
  static readonly WINDOW_MS = 60_000;

  constructor(private readonly clock: Clock) {}

  current(): Date {
    const now = this.clock.now().getTime();
    return new Date(now - (now % UsageWindowClock.WINDOW_MS));
  }

  /**
   * Las ventanas anteriores a la previa a la actual: la previa todavía puede recibir lo que cuenta una
   * instancia con el reloj algo atrasado.
   */
  closedBefore(): Date {
    return new Date(this.current().getTime() - UsageWindowClock.WINDOW_MS);
  }
}
