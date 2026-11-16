import type { ShardKey } from '@platform/sharding';

/** Cómo enruta el servicio sus datos por defecto. */
export interface ServiceSharding {
  /** Llave de las transacciones que no declaran la suya. */
  readonly defaultKey: ShardKey;
  /** Con `true`, sin un `ShardScope` activo toda resolución falla con `PLATFORM.SHARDING.KEY_MISSING`. */
  readonly requireScope: boolean;
}
