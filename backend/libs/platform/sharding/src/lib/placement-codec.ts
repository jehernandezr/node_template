import { TenantStatus, type TenantPlacement } from './types.js';

/** A placement as stored in the shared cache, with the instant it stops being trusted. */
export interface SharedPlacementEntry {
  readonly placement: TenantPlacement;
  readonly expiresAt: number;
}

/**
 * Marker left in the shared cache by an invalidation. It is stored with a cache version higher than the
 * placement it replaces, so `setIfNewer` refuses a read in flight that tries to write the old placement back.
 */
export interface SharedTombstone {
  readonly cacheVersion: number;
  readonly expiresAt: number;
}

/** What a shared cache key can hold. */
export type SharedRecord =
  | { readonly kind: 'placement'; readonly entry: SharedPlacementEntry }
  | { readonly kind: 'tombstone'; readonly tombstone: SharedTombstone };

/**
 * Cache version of a placement. Placements take even numbers (`2 × version`) so a tombstone can sit strictly
 * between two placement versions: tombstone `2N − 1` refuses every version below N and accepts N.
 */
export function placementCacheVersion(version: number): number {
  return version * 2;
}

/**
 * Cache version of a tombstone written without knowing any placement version. It is above every placement
 * version in practice (versions below 2^51), so it refuses every write until it expires.
 */
export const UNVERSIONED_TOMBSTONE_VERSION = 2 ** 52;

const KNOWN_STATUSES = new Set<string>(Object.values(TenantStatus));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Serializes a shared cache entry. */
export function encodeSharedEntry(entry: SharedPlacementEntry): string {
  return JSON.stringify(entry);
}

/** Serializes a tombstone. */
export function encodeTombstone(tombstone: SharedTombstone): string {
  return JSON.stringify({
    tombstone: true,
    cacheVersion: tombstone.cacheVersion,
    expiresAt: tombstone.expiresAt,
  });
}

function decodePlacement(value: unknown): TenantPlacement | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { tenantId, region, shardGroup, status, version, dedicated } = value;
  if (!isNonEmptyString(tenantId) || !isNonEmptyString(region)) {
    return undefined;
  }
  if (
    !Array.isArray(shardGroup) ||
    shardGroup.length === 0 ||
    !shardGroup.every(isNonEmptyString)
  ) {
    return undefined;
  }
  if (typeof status !== 'string' || !KNOWN_STATUSES.has(status)) {
    return undefined;
  }
  if (!isVersion(version) || typeof dedicated !== 'boolean') {
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

/**
 * Parses and validates whatever a shared cache key holds. Anything malformed returns undefined,
 * so the caller treats it as a miss (fail closed).
 */
export function decodeSharedRecord(
  raw: string | undefined,
): SharedRecord | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(data)) {
    return undefined;
  }
  const { expiresAt } = data;
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return undefined;
  }
  if (data['tombstone'] === true) {
    const { cacheVersion } = data;
    return isVersion(cacheVersion)
      ? { kind: 'tombstone', tombstone: { cacheVersion, expiresAt } }
      : undefined;
  }
  const placement = decodePlacement(data['placement']);
  return placement === undefined
    ? undefined
    : { kind: 'placement', entry: { placement, expiresAt } };
}

/** Parses a shared cache entry. Tombstones and malformed values return undefined. */
export function decodeSharedEntry(
  raw: string | undefined,
): SharedPlacementEntry | undefined {
  const record = decodeSharedRecord(raw);
  return record?.kind === 'placement' ? record.entry : undefined;
}
