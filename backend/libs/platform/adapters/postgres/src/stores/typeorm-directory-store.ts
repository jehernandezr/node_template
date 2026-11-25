import type { Clock } from '@platform/kernel';
import { PersistenceError, type ShardLocation } from '@platform/persistence';
import {
  DirectoryWriteResult,
  ShardingError,
  ShardingErrorCode,
  type DirectoryStore,
  type DirectoryWriter,
  type TenantPlacement,
} from '@platform/sharding';
import type { EntityManager } from 'typeorm';
import type { CatalogEntityManagers } from '../database/catalog-entity-managers.js';
import { ShardDirectoryEntity } from '../entities/shard-directory.entity.js';
import { ShardInstanceEntity } from '../entities/shard-instance.entity.js';
import { ShardLockEntity } from '../entities/shard-lock.entity.js';
import type { TypeOrmDirectoryStoreOptions } from '../model/typeorm-directory-store-options.js';
import { PlacementMapper } from './placement.mapper.js';
import { PlacementValidator } from './placement.validator.js';

/**
 * Adaptador TypeORM del `DirectoryStore` y el `DirectoryWriter` de `@platform/sharding`, sobre las tablas
 * `shard_directory`, `shard_instances` y `shard_locks` del catálogo.
 *
 * `putPlacement` es la escritura de las sagas de alta y traslado: compare-and-set por versión y exclusividad de shards
 * en una sola transacción. Toma con `SELECT ... FOR UPDATE` la fila de cada shard destino en `shard_locks` (creándola
 * si falta, en orden para evitar interbloqueos) y la del tenant; con los candados puestos relee el directorio y
 * comprueba versión y exclusividad. `setPlacementIfNewer` es la escritura simple por versión, un solo
 * `INSERT ... ON CONFLICT DO UPDATE ... WHERE version < EXCLUDED.version`.
 */
export class TypeOrmDirectoryStore implements DirectoryStore, DirectoryWriter {
  constructor(
    private readonly catalog: CatalogEntityManagers,
    private readonly clock: Clock,
    private readonly options: TypeOrmDirectoryStoreOptions = {},
  ) {}

  async getPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    const entity = await this.read((manager) =>
      manager.findOneBy(ShardDirectoryEntity, { tenantId }),
    );
    return entity === null ? undefined : PlacementMapper.toPlacement(entity);
  }

  async getInstance(logicalShard: string): Promise<string | undefined> {
    const entity = await this.read((manager) =>
      manager.findOneBy(ShardInstanceEntity, { logicalShard }),
    );
    return entity === null ? undefined : entity.instance;
  }

  async readPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    const entity = await this.catalog.readPrimary((manager) =>
      manager.findOneBy(ShardDirectoryEntity, { tenantId }),
    );
    return entity === null ? undefined : PlacementMapper.toPlacement(entity);
  }

  /** Siempre del primario: la política de ubicación no tolera datos atrasados. */
  async listPlacements(region: string): Promise<readonly TenantPlacement[]> {
    if (typeof region !== 'string' || region.length === 0) {
      throw PersistenceError.invalidConfiguration(
        'region',
        'a non-empty string',
      );
    }
    const entities = await this.catalog.readPrimary((manager) =>
      manager.find(ShardDirectoryEntity, {
        where: { region },
        order: { tenantId: 'ASC' },
      }),
    );
    return entities.map((entity) => PlacementMapper.toPlacement(entity));
  }

  /**
   * @throws ShardingError `InvalidConfiguration` cuando la versión nueva no es `expectedVersion + 1` (o 1 para un
   * tenant nuevo).
   */
  async putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult> {
    PlacementValidator.assert(placement);
    if (
      expectedVersion !== undefined &&
      (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    ) {
      throw PersistenceError.invalidConfiguration(
        'expectedVersion',
        'a non-negative integer or undefined',
      );
    }
    if (placement.version !== (expectedVersion ?? 0) + 1) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'placement.version must be expectedVersion + 1, or 1 for a new tenant',
        { details: { option: 'version' } },
      );
    }
    return this.catalog.write(async (manager) => {
      await this.lockShards(manager, placement.shardGroup);
      const stored = await manager
        .createQueryBuilder(ShardDirectoryEntity, 'd')
        .setLock('pessimistic_write')
        .where('d.tenantId = :tenantId', { tenantId: placement.tenantId })
        .getOne();
      if (stored?.version !== expectedVersion) {
        return DirectoryWriteResult.VersionConflict;
      }
      if (await this.isShardTaken(manager, placement)) {
        return DirectoryWriteResult.ShardTaken;
      }
      return this.writeGuarded(manager, placement, expectedVersion);
    });
  }

  async deletePlacement(
    tenantId: string,
    expectedVersion: number,
  ): Promise<DirectoryWriteResult> {
    const result = await this.catalog.write((manager) =>
      manager.delete(ShardDirectoryEntity, {
        tenantId,
        version: expectedVersion,
      }),
    );
    return (result.affected ?? 0) > 0
      ? DirectoryWriteResult.Written
      : DirectoryWriteResult.VersionConflict;
  }

  /** Shards lógicos registrados, ordenados por id. */
  async listShards(): Promise<string[]> {
    const entities = await this.read((manager) =>
      manager.find(ShardInstanceEntity, { order: { logicalShard: 'ASC' } }),
    );
    return entities.map((entity) => entity.logicalShard);
  }

  /** Shards lógicos con su instancia, ordenados por id. Es lo que lista `DirectoryShardLister`. */
  async listShardLocations(): Promise<readonly ShardLocation[]> {
    const entities = await this.read((manager) =>
      manager.find(ShardInstanceEntity, { order: { logicalShard: 'ASC' } }),
    );
    return entities.map((entity) => ({
      logicalShard: entity.logicalShard,
      instance: entity.instance,
    }));
  }

  /** Escribe la ubicación si es nueva o su versión es mayor que la guardada. Devuelve `true` si escribió. */
  async setPlacementIfNewer(placement: TenantPlacement): Promise<boolean> {
    PlacementValidator.assert(placement);
    return this.catalog.write(async (manager) => {
      // orUpdate de TypeORM no admite el WHERE de versión, y Postgres no devuelve fila si la versión guardada no es
      // menor: por eso el INSERT va como SQL y la respuesta dice si la fila se escribió.
      const rows: { version: string | number }[] = await manager.query(
        'INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
          'ON CONFLICT (tenant_id) DO UPDATE SET region = EXCLUDED.region, shard_group = EXCLUDED.shard_group, ' +
          'status = EXCLUDED.status, version = EXCLUDED.version, dedicated = EXCLUDED.dedicated, updated_at = EXCLUDED.updated_at ' +
          'WHERE shard_directory.version < EXCLUDED.version RETURNING version',
        [
          placement.tenantId,
          placement.region,
          [...placement.shardGroup],
          placement.status,
          placement.version,
          placement.dedicated,
          this.clock.now(),
        ],
      );
      return rows.some((row) => Number(row.version) === placement.version);
    });
  }

  /** Registra o mueve un shard lógico a una instancia física. */
  async setInstance(logicalShard: string, instance: string): Promise<void> {
    if (typeof logicalShard !== 'string' || logicalShard.length === 0) {
      throw PersistenceError.invalidConfiguration(
        'logicalShard',
        'a non-empty string',
      );
    }
    if (typeof instance !== 'string' || instance.length === 0) {
      throw PersistenceError.invalidConfiguration(
        'instance',
        'a non-empty string',
      );
    }
    await this.catalog.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(ShardInstanceEntity)
        .values({ logicalShard, instance, updatedAt: this.clock.now() })
        .orUpdate(['instance', 'updated_at'], ['logical_shard'])
        .execute(),
    );
  }

  private read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.options.readPrimary === true
      ? this.catalog.readPrimary(fn)
      : this.catalog.read(fn);
  }

  /** Toma el candado de cada shard, en orden y sin repetidos, hasta el fin de la transacción. */
  private async lockShards(
    manager: EntityManager,
    shards: readonly string[],
  ): Promise<void> {
    const ordered = [...new Set(shards)].sort();
    for (const logicalShard of ordered) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(ShardLockEntity)
        .values({ logicalShard })
        .orIgnore()
        .execute();
    }
    await manager
      .createQueryBuilder(ShardLockEntity, 'l')
      .setLock('pessimistic_write')
      .where('l.logicalShard IN (:...shards)', { shards: ordered })
      .orderBy('l.logicalShard')
      .getMany();
  }

  /**
   * Otro tenant ocupa un shard del grupo: si este placement es dedicado, cualquier otro tenant; si no, solo un tenant
   * dedicado. El QueryBuilder no tiene el operador de solape de arreglos.
   */
  private async isShardTaken(
    manager: EntityManager,
    placement: TenantPlacement,
  ): Promise<boolean> {
    const taken: unknown[] = await manager.query(
      'SELECT 1 AS taken FROM shard_directory WHERE tenant_id <> $1 AND shard_group && $2::text[] AND (dedicated OR $3::boolean) LIMIT 1',
      [placement.tenantId, [...placement.shardGroup], placement.dedicated],
    );
    return taken.length > 0;
  }

  /** Inserta si no hay versión esperada, o actualiza solo si la versión guardada sigue siendo la esperada. */
  private async writeGuarded(
    manager: EntityManager,
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult> {
    const values = {
      region: placement.region,
      shardGroup: [...placement.shardGroup],
      status: placement.status,
      version: placement.version,
      dedicated: placement.dedicated,
      updatedAt: this.clock.now(),
    };
    if (expectedVersion === undefined) {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(ShardDirectoryEntity)
        .values({ tenantId: placement.tenantId, ...values })
        .orIgnore()
        .returning('tenant_id')
        .execute();
      return (result.raw as unknown[]).length > 0
        ? DirectoryWriteResult.Written
        : DirectoryWriteResult.VersionConflict;
    }
    const result = await manager
      .createQueryBuilder()
      .update(ShardDirectoryEntity)
      .set(values)
      .where({ tenantId: placement.tenantId, version: expectedVersion })
      .execute();
    return (result.affected ?? 0) > 0
      ? DirectoryWriteResult.Written
      : DirectoryWriteResult.VersionConflict;
  }
}
