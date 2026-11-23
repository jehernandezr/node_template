/**
 * Cuándo toca el próximo intento de una entrega. `NotifyUser` envía apenas confirma, así que el primer
 * reintento espera un margen para no competir con ese envío; después, cada fallo duplica la espera.
 * Utilidad pura.
 */
export class DeliveryRetrySchedule {
  static readonly FIRST_RETRY_MS = 2 * 60_000;

  static firstRetryAt(now: Date): Date {
    return new Date(now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS);
  }

  static afterFailure(attempts: number, now: Date): Date {
    return new Date(
      now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS * 2 ** attempts,
    );
  }
}
