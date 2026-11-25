import type { TenantPlacement } from '../model/tenant-placement.js';
import { TenantStatus } from '../model/tenant-status.enum.js';
import { SharedRecordKind } from './shared-record-kind.enum.js';
import type {
  SharedPlacementEntry,
  SharedRecord,
  SharedTombstone,
} from './shared-record.js';

/**
 * Serializes and validates what `ShardRouter` stores in the shared cache, and
 * computes cache versions. It is pure and stateless.
 */
export class PlacementCodec {
  /**
   * Cache version of a tombstone written without knowing any placement
   * version. In practice it is above every placement version
   * (lower than 2^51), so it rejects every write until it expires.
   */
  static readonly UNVERSIONED_TOMBSTONE_VERSION = 2 ** 52;

  private static readonly KNOWN_STATUSES = new Set<string>(
    Object.values(TenantStatus),
  );

  /**
   * Cache version of a placement. Placements take even numbers
   * (`2 × version`) so that a tombstone falls strictly between two
   * versions: tombstone `2N − 1` rejects every version lower than N and accepts N.
   */
  static cacheVersion(version: number): number {
    return version * 2;
  }

  /**
   * Cache version of the tombstone that replaces a placement: above
   * every version this router sees, and at least `2N − 1` when the caller gives
   * the committed version N (rejects below N, accepts N).
   */
  static tombstoneVersion(
    local: TenantPlacement | undefined,
    shared: SharedRecord | undefined,
    committedVersion: number | undefined,
  ): number {
    const candidates: number[] = [];
    if (local !== undefined) {
      candidates.push(PlacementCodec.cacheVersion(local.version) + 1);
    }
    if (shared?.kind === SharedRecordKind.Placement) {
      candidates.push(
        PlacementCodec.cacheVersion(shared.entry.placement.version) + 1,
      );
    } else if (shared?.kind === SharedRecordKind.Tombstone) {
      candidates.push(shared.tombstone.cacheVersion + 1);
    }
    if (committedVersion !== undefined) {
      candidates.push(PlacementCodec.cacheVersion(committedVersion) - 1);
    }
    if (candidates.length === 0) {
      return PlacementCodec.UNVERSIONED_TOMBSTONE_VERSION;
    }
    return Math.min(Math.max(...candidates), Number.MAX_SAFE_INTEGER);
  }

  static encodeEntry(entry: SharedPlacementEntry): string {
    return JSON.stringify(entry);
  }

  static encodeTombstone(tombstone: SharedTombstone): string {
    return JSON.stringify({
      tombstone: true,
      cacheVersion: tombstone.cacheVersion,
      expiresAt: tombstone.expiresAt,
    });
  }

  /**
   * Parses and validates the content of a shared cache key. Anything
   * malformed returns `undefined`, so the caller treats it as a miss (fails closed).
   */
  static decode(raw: string | undefined): SharedRecord | undefined {
    if (raw === undefined) {
      return undefined;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (!PlacementCodec.isRecord(data)) {
      return undefined;
    }
    const { expiresAt } = data;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
      return undefined;
    }
    if (data['tombstone'] === true) {
      const { cacheVersion } = data;
      return PlacementCodec.isVersion(cacheVersion)
        ? {
            kind: SharedRecordKind.Tombstone,
            tombstone: { cacheVersion, expiresAt },
          }
        : undefined;
    }
    const placement = PlacementCodec.decodePlacement(data['placement']);
    return placement === undefined
      ? undefined
      : {
          kind: SharedRecordKind.Placement,
          entry: { placement, expiresAt },
        };
  }

  private static decodePlacement(value: unknown): TenantPlacement | undefined {
    if (!PlacementCodec.isRecord(value)) {
      return undefined;
    }
    const { tenantId, region, shardGroup, status, version, dedicated } = value;
    if (
      !PlacementCodec.isNonEmptyString(tenantId) ||
      !PlacementCodec.isNonEmptyString(region)
    ) {
      return undefined;
    }
    if (
      !Array.isArray(shardGroup) ||
      shardGroup.length === 0 ||
      !shardGroup.every(PlacementCodec.isNonEmptyString)
    ) {
      return undefined;
    }
    if (
      typeof status !== 'string' ||
      !PlacementCodec.KNOWN_STATUSES.has(status)
    ) {
      return undefined;
    }
    if (!PlacementCodec.isVersion(version) || typeof dedicated !== 'boolean') {
      return undefined;
    }
    return {
      tenantId,
      region,
      shardGroup: [...shardGroup],
      status: status as TenantStatus,
      version,
      dedicated,
    };
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  private static isVersion(value: unknown): value is number {
    return (
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    );
  }
}
