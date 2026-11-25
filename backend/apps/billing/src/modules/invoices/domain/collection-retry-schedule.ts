/**
 * Cuándo se vuelve a cobrar una factura rechazada: tras el rechazo número `n` espera `delaysDays[n - 1]` días. Agotado
 * el calendario no hay más reintentos automáticos: la morosidad sigue su curso y un pago tardío la salda igual.
 * Los reintentos caen dentro de la gracia de morosidad para que un rechazo pasajero de la tarjeta no suspenda.
 */
export class CollectionRetrySchedule {
  static readonly STANDARD = new CollectionRetrySchedule([1, 3, 5]);
  private static readonly DAY_MS = 86_400_000;

  constructor(private readonly delaysDays: readonly number[]) {}

  /** El próximo cobro después del rechazo número `failedAttempts`, o `undefined` si no quedan reintentos. */
  nextAfter(failedAttempts: number, failedAt: Date): Date | undefined {
    const days = this.delaysDays[failedAttempts - 1];
    return days === undefined
      ? undefined
      : new Date(failedAt.getTime() + days * CollectionRetrySchedule.DAY_MS);
  }
}
