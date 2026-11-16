import { PlatformErrorCode } from '@contracts/platform';
import { PersistenceError } from '@platform/persistence';
import { TenantStatus, type TenantPlacement } from '@platform/sharding';
import type { ShardDirectoryEntity } from '../entities/shard-directory.entity.js';

/** Convierte una fila de `shard_directory` en el `TenantPlacement` del puerto, validando su forma. */
export class PlacementMapper {
  private static readonly STATUSES: readonly string[] =
    Object.values(TenantStatus);

  /** @throws PersistenceError `PersistenceCorruptRow` si la fila no tiene la forma de un placement. */
  static toPlacement(entity: ShardDirectoryEntity): TenantPlacement {
    if (!PlacementMapper.isWellFormed(entity)) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceCorruptRow,
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
