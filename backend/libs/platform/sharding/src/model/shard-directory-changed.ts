import type { ShardDirectoryChangeKind } from './shard-directory-change-kind.enum.js';
import type { ShardingEvent } from './sharding-event.enum.js';

/** Cambió el placement de un tenant. */
export interface TenantPlacementChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.TenantPlacement;
  readonly tenantId: string;
  /**
   * Versión del placement recién confirmada. Quien la recibe descarta las
   * versiones anteriores de todos los niveles de caché. Sin ella solo descarta
   * su copia en proceso.
   */
  readonly version?: number;
}

/** Un shard lógico pasó a otra instancia. */
export interface ShardInstanceChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.ShardInstance;
  readonly logicalShard: string;
}

/** Contenido de {@link ShardingEvent.ShardDirectoryChanged}. */
export type ShardDirectoryChanged =
  TenantPlacementChanged | ShardInstanceChanged;

/** Quien recibe un cambio. Los errores los reporta el suscriptor, nunca los devuelve al canal. */
export type ShardDirectoryChangeHandler = (
  event: ShardDirectoryChanged,
) => void | Promise<void>;
