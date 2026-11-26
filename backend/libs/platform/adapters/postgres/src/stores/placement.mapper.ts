import { PersistenceError, PersistenceErrorCode } from '@platform/persistence';
import { TenantStatus, type TenantPlacement } from '@platform/sharding';
import type { ShardDirectoryEntity } from '../entities/shard-directory.entity.js';

/** Converts a `shard_directory` row into the port's `TenantPlacement`, validating its shape. */
export class PlacementMapper {
  private static readonly STATUSES: readonly string[] =
    Object.values(TenantStatus);

  /**
   * Rebuilds a placement from its directory row.
   * @param entity Stored row.
   * @returns The placement.
   * @throws PersistenceError `PersistenceCorruptRow` if the row does not have the shape of a placement.
   */
  static toPlacement(entity: ShardDirectoryEntity): TenantPlacement {
    if (!PlacementMapper.isWellFormed(entity)) {
      throw new PersistenceError(
        PersistenceErrorCode.CorruptRow,
        'Shard directory row has an invalid shape',
      );
    }
    return {
      tenantId: entity.tenantId,
      region: entity.region,
      shardGroup: [...entity.shardGroup],
      status: entity.status,
      version: entity.version,
      dedicated: entity.dedicated,
    };
  }

  private static isWellFormed(entity: ShardDirectoryEntity): boolean {
    const group: unknown = entity.shardGroup;
    return (
      Array.isArray(group) &&
      group.length > 0 &&
      group.every(
        (shard: unknown) => typeof shard === 'string' && shard.length > 0,
      ) &&
      PlacementMapper.STATUSES.includes(entity.status) &&
      Number.isSafeInteger(entity.version) &&
      entity.version >= 0 &&
      typeof entity.dedicated === 'boolean'
    );
  }
}
