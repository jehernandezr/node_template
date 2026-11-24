/** Códigos de error de `@platform/tenant-move`. */
export enum TenantMoveErrorCode {
  /** El grupo de destino no está en `TENANT_MOVE_TARGETS` o su shard no está en el directorio. */
  UnknownTarget = 'PLATFORM.TENANT_MOVE.UNKNOWN_TARGET',
  /** El tenant reparte sus datos en más de un shard, o ya vive en el destino. */
  NotMovable = 'PLATFORM.TENANT_MOVE.NOT_MOVABLE',
  /** La ronda no terminó en el plazo de la llamada; la saga la repite. */
  RoundPending = 'PLATFORM.TENANT_MOVE.ROUND_PENDING',
  /** Con el tenant congelado, el destino no quedó igual al origen. */
  VerificationFailed = 'PLATFORM.TENANT_MOVE.VERIFICATION_FAILED',
  /** Con la barrera levantada, el tenant todavía tiene trabajo abierto en el origen (una saga a medias). */
  TenantBusy = 'PLATFORM.TENANT_MOVE.TENANT_BUSY',
  /** El directorio del servicio todavía lleva al tenant al shard que la limpieza iba a borrar. */
  NotSwitched = 'PLATFORM.TENANT_MOVE.NOT_SWITCHED',
  /** El manifiesto nombra una tabla o columna inválida, o un padre que no lo precede. */
  InvalidManifest = 'PLATFORM.TENANT_MOVE.INVALID_MANIFEST',
}
