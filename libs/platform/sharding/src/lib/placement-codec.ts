import { TenantStatus, type TenantPlacement } from './types.js';

/** A placement as stored in the shared cache, with the instant it stops being trusted. */
export interface SharedPlacementEntry {
  readonly placement: TenantPlacement;
  readonly expiresAt: number;
}

const KNOWN_STATUSES = new Set<string>(Object.values(TenantStatus));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Serializes a shared cache entry. */
export function encodeSharedEntry(entry: SharedPlacementEntry): string {
  return JSON.stringify(entry);
}

/**
 * Parses and validates a shared cache entry. Anything malformed returns undefined,
 * so the caller treats it as a miss (fail closed).
 */
export function decodeSharedEntry(
  raw: string | undefined,
): SharedPlacementEntry | undefined {
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
  const { placement, expiresAt } = data;
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return undefined;
  }
  if (!isRecord(placement)) {
    return undefined;
  }
  const { tenantId, region, shardGroup, status, version, dedicated } =
    placement;
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
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 0
  ) {
    return undefined;
  }
  if (typeof dedicated !== 'boolean') {
    return undefined;
  }
  return {
    placement: {
      tenantId,
      region,
      shardGroup: [...shardGroup],
      status: status as TenantStatus,
      version,
      dedicated,
    },
    expiresAt,
  };
}
