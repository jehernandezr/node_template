import { TenantStatus, type TenantPlacement } from '@platform/sharding';
import { PersistenceError } from '@platform/persistence';

/** Validates a `TenantPlacement` that comes from the directory writer, before touching the database. */
export class PlacementValidator {
  private static readonly STATUSES: readonly string[] =
    Object.values(TenantStatus);

  /**
   * Validates a placement before it is written.
   * @param placement Placement to check.
   * @throws PersistenceError `PersistenceInvalidConfig` for the first invalid field.
   */
  static assert(placement: TenantPlacement): void {
    const { tenantId, region, shardGroup, status, version, dedicated } =
      placement;
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw PersistenceError.invalidConfiguration(
        'placement.tenantId',
        'a non-empty string',
      );
    }
    if (typeof region !== 'string' || region.length === 0) {
      throw PersistenceError.invalidConfiguration(
        'placement.region',
        'a non-empty string',
      );
    }
    if (
      !Array.isArray(shardGroup) ||
      shardGroup.length === 0 ||
      !shardGroup.every(
        (shard: unknown) => typeof shard === 'string' && shard.length > 0,
      )
    ) {
      throw PersistenceError.invalidConfiguration(
        'placement.shardGroup',
        'a non-empty list of shard ids',
      );
    }
    if (!PlacementValidator.STATUSES.includes(status)) {
      throw PersistenceError.invalidConfiguration(
        'placement.status',
        'a TenantStatus',
      );
    }
    if (!Number.isSafeInteger(version) || version < 0) {
      throw PersistenceError.invalidConfiguration(
        'placement.version',
        'a non-negative integer',
      );
    }
    if (typeof dedicated !== 'boolean') {
      throw PersistenceError.invalidConfiguration(
        'placement.dedicated',
        'a boolean',
      );
    }
  }
}
