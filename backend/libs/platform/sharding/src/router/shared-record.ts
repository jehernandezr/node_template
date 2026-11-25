import type { TenantPlacement } from '../model/tenant-placement.js';
import type { SharedRecordKind } from './shared-record-kind.enum.js';

/** A placement as stored in the shared cache, with the instant from which it is no longer trusted. */
export interface SharedPlacementEntry {
  readonly placement: TenantPlacement;
  readonly expiresAt: number;
}

/**
 * Marker an invalidation leaves in the shared cache. It is stored with a
 * cache version higher than the placement it replaces, so `setIfNewer`
 * rejects an in-flight read that tries to put back the old placement.
 */
export interface SharedTombstone {
  readonly cacheVersion: number;
  readonly expiresAt: number;
}

/** What a shared cache key can contain. */
export type SharedRecord =
  | {
      readonly kind: SharedRecordKind.Placement;
      readonly entry: SharedPlacementEntry;
    }
  | {
      readonly kind: SharedRecordKind.Tombstone;
      readonly tombstone: SharedTombstone;
    };
