/** Consultas sobre las suscripciones de todos los tenants, en todos los shards, para los jobs. */
export abstract class SubscriptionMaintenance {
  /** Tenants cuya suscripción terminó su periodo antes de `today` y no está suspendida ni cancelada. */
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /** Tenants morosos desde antes de `cutoff`. */
  abstract pastDueBefore(cutoff: Date): Promise<readonly string[]>;
}
