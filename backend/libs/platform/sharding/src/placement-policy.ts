import type { TenantPlacement } from './model/tenant-placement.js';

/** Petición para ubicar un tenant nuevo. */
export interface PlacementRequest {
  readonly tenantId: string;
  readonly region: string;
  /** Si es true, el tenant recibe un shard que ningún otro tenant usa, y nadie más lo puede usar después. */
  readonly dedicated: boolean;
}

/** Un shard lógico que puede recibir tenants, con su región. */
export interface AvailableShard {
  readonly region: string;
  readonly shard: string;
}

/**
 * Decide dónde se ubica un tenant nuevo: el shard menos cargado, la región del
 * tenant o un shard dedicado. Las políticas son puras; `TenantPlacer` escribe su
 * respuesta con una escritura condicional, así dos altas concurrentes no pueden
 * tomar el mismo shard.
 */
export abstract class ShardPlacementPolicy {
  abstract place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement;
}
