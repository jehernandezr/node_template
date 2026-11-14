import type { TenantPlacement } from '../model/tenant-placement.js';
import type { SharedRecordKind } from './shared-record-kind.enum.js';

/** Un placement tal como se guarda en el caché compartido, con el instante en que deja de confiarse en él. */
export interface SharedPlacementEntry {
  readonly placement: TenantPlacement;
  readonly expiresAt: number;
}

/**
 * Marca que deja una invalidación en el caché compartido. Se guarda con una
 * versión de caché mayor que el placement que reemplaza, así `setIfNewer`
 * rechaza una lectura en vuelo que intenta devolver el placement viejo.
 */
export interface SharedTombstone {
  readonly cacheVersion: number;
  readonly expiresAt: number;
}

/** Lo que puede contener una clave del caché compartido. */
export type SharedRecord =
  | {
      readonly kind: SharedRecordKind.Placement;
      readonly entry: SharedPlacementEntry;
    }
  | {
      readonly kind: SharedRecordKind.Tombstone;
      readonly tombstone: SharedTombstone;
    };
