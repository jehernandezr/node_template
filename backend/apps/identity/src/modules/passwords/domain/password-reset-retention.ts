/** Limpieza de las recuperaciones de contraseña de todos los shards. */
export abstract class PasswordResetRetention {
  /** Borra las recuperaciones que vencieron antes de `cutoff` y devuelve cuántas. */
  abstract purgeExpiredBefore(cutoff: Date): Promise<number>;
}
