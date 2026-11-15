import {
  IsNull,
  type EntityManager,
  type EntityMetadata,
  type EntityTarget,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { OptimisticLockError } from './errors.js';
import type { VersionedEntity } from './entities/versioned-entity.js';

/**
 * Actualiza una fila solo si su versión sigue siendo la que se leyó. Lo comparten
 * `ShardedRepository` y `CatalogRepository`.
 */
export class OptimisticWriter {
  /**
   * `UPDATE ... WHERE id = :id AND version = :version` más las condiciones de `scope`, que sube la versión en uno.
   * @throws OptimisticLockError si ninguna fila cumple (otra escritura ya cambió la versión, o la fila no existe).
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
    // La versión y las fechas de auditoría las pone la base: TypeORM suma la versión y
    // actualiza `updated_at` en cada UPDATE, y `created_*` nunca cambia.
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

  /** Columnas que el UPDATE escribe: no la clave, la versión, las fechas de TypeORM, el borrado ni el tenant y el autor de creación. */
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
