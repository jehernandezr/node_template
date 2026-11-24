import type { TenantMoveRef } from '@contracts/platform';

/** Lo que un servicio hace además de mover sus datos cuando un traslado cambia de directorio o se cancela. */
export abstract class TenantMoveListener {
  /** Después de apuntar el servicio al destino. Se reintenta hasta completarse, así que es idempotente. */
  abstract switched(move: TenantMoveRef): Promise<void>;

  /** Después de descartar la copia. Idempotente. */
  abstract aborted(move: TenantMoveRef): Promise<void>;
}
