import type { TenantPlacement } from '../model/tenant-placement.js';
import { TenantStatus } from '../model/tenant-status.enum.js';
import { SharedRecordKind } from './shared-record-kind.enum.js';
import type {
  SharedPlacementEntry,
  SharedRecord,
  SharedTombstone,
} from './shared-record.js';

/**
 * Serializa y valida lo que `ShardRouter` guarda en el caché compartido, y
 * calcula las versiones de caché. Es pura y sin estado.
 */
export class PlacementCodec {
  /**
   * Versión de caché de una lápida escrita sin conocer ninguna versión de
   * placement. Queda por encima de toda versión de placement en la práctica
   * (menores que 2^51), así rechaza toda escritura hasta expirar.
   */
  static readonly UNVERSIONED_TOMBSTONE_VERSION = 2 ** 52;

  private static readonly KNOWN_STATUSES = new Set<string>(
    Object.values(TenantStatus),
  );

  /**
   * Versión de caché de un placement. Los placements toman números pares
   * (`2 × versión`) para que una lápida quede estrictamente entre dos
   * versiones: la lápida `2N − 1` rechaza toda versión menor que N y acepta N.
   */
  static cacheVersion(version: number): number {
    return version * 2;
  }

  /**
   * Versión de caché de la lápida que reemplaza a un placement: por encima de
   * toda versión que este router ve, y al menos `2N − 1` cuando quien llama da
   * la versión confirmada N (rechaza por debajo de N, acepta N).
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
   * Interpreta y valida lo que contiene una clave del caché compartido. Todo
   * lo malformado devuelve `undefined`, así quien llama lo trata como un fallo (falla cerrado).
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
