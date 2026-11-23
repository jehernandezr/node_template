/** Mantenimiento de las bandejas de todos los shards. */
export abstract class InboxMaintenance {
  /** Borra las notificaciones leídas antes de `cutoff` y devuelve cuántas. */
  abstract purgeReadBefore(cutoff: Date): Promise<number>;
}
