/** Códigos de error de `@platform/tenant-move`. */
export enum TenantMoveErrorCode {
  /** El grupo de destino o de alta no está configurado, o su shard no está en el directorio. */
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
  /** Otro traslado del tenant está entre `finalize` y `switch`: limpiar ahora podría borrar su copia. */
  MoveInProgress = 'PLATFORM.TENANT_MOVE.MOVE_IN_PROGRESS',
  /** El tenant ya tiene datos en el servicio: retirarlo del directorio los dejaría huérfanos. */
  TenantHasData = 'PLATFORM.TENANT_MOVE.TENANT_HAS_DATA',
  /** El grupo del tenant choca en el directorio del servicio con un tenant dedicado, o es dedicado y el shard está ocupado. */
  ShardTaken = 'PLATFORM.TENANT_MOVE.SHARD_TAKEN',
  /** El manifiesto nombra una tabla o columna inválida, o un padre que no lo precede. */
  InvalidManifest = 'PLATFORM.TENANT_MOVE.INVALID_MANIFEST',
}
