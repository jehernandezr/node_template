import {
  IsNull,
  type EntityManager,
  type EntityMetadata,
  type EntityTarget,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { OptimisticLockError } from './errors/optimistic-lock.error.js';
import type { VersionedEntity } from './entities/versioned-entity.js';

/**
 * Updates a row only if its version is still the one that was read. `TenantIsolatedRepository` and the
 * service repositories without a tenant column use it.
 */
export class OptimisticWriter {
  /**
   * `UPDATE ... WHERE id = :id AND version = :version` plus the `scope` conditions, which increments the version by one.
   * The version and audit dates are set by the database: TypeORM increments the version and updates `updated_at` on each UPDATE, and `created_*` never changes.
   * @throws OptimisticLockError if no row matches (another write already changed the version, or the row does not exist).
   */
  async update<TEntity extends VersionedEntity>(
    manager: EntityManager,
    target: EntityTarget<TEntity>,
    entity: TEntity,
    scope: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const metadata = manager.connection.getMetadata(target);
    const values: Record<string, unknown> = {};
    for (const column of metadata.columns) {
      if (OptimisticWriter.isWritable(column)) {
        values[column.propertyName] = column.getEntityValue(entity);
      }
    }
    const result = await manager
      .createQueryBuilder()
      .update(target)
      .set(values as QueryDeepPartialEntity<TEntity>)
      .where({
        ...scope,
        id: entity.id,
        version: entity.version,
        deletedAt: IsNull(),
      })
      .execute();
    if (!result.affected) {
      throw new OptimisticLockError(metadata.tableName, entity.version ?? 0);
    }
  }

  /** Columns written by the UPDATE: not the key, the version, the TypeORM dates, the deletion, or the creation tenant and author. */
  private static isWritable(
    column: EntityMetadata['columns'][number],
  ): boolean {
    return (
      !column.isPrimary &&
      !column.isCreateDate &&
      !column.isUpdateDate &&
      !column.isVersion &&
      !column.isDeleteDate &&
      column.propertyName !== 'tenantId' &&
      column.propertyName !== 'createdBy'
    );
  }
}
