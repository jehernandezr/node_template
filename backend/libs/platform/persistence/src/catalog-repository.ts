import type { Criteria, CursorCodec, Page } from '@platform/criteria';
import {
  type EntityManager,
  type EntityTarget,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import type { CatalogDataSource } from './catalog-data-source.js';
import { CriteriaFieldMap } from './criteria-field-map.js';
import type { VersionedEntity } from './entities/versioned-entity.js';
import type { EntityMapper } from './model/entity-mapper.js';
import type { OptimisticWriter } from './optimistic-writer.js';
import { TypeOrmCriteriaTranslator } from './typeorm-criteria-translator.js';

/**
 * Base de los repositorios del catálogo global: lo mismo que `ShardedRepository`, sin tenant y sin
 * ruteo, siempre sobre el `DataSource` del catálogo.
 */
export abstract class CatalogRepository<
  TAggregate,
  TEntity extends VersionedEntity,
> {
  protected constructor(
    protected readonly entityClass: EntityTarget<TEntity>,
    protected readonly catalog: CatalogDataSource,
    protected readonly mapper: EntityMapper<TAggregate, TEntity>,
    protected readonly writer: OptimisticWriter,
  ) {}

  /** Lee con un manager de la réplica del catálogo. */
  protected async read<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner('slave');
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }

  /** Escribe en una transacción del primario del catálogo. */
  protected async write<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.catalog.get();
    return dataSource.transaction((manager) => fn(manager));
  }

  async findById(id: string): Promise<TAggregate | null> {
    return this.read(async (manager) => {
      const entity = await manager.findOneBy(this.entityClass, {
        id,
      } as FindOptionsWhere<TEntity>);
      return entity === null ? null : this.mapper.toDomain(entity);
    });
  }

  /** @throws OptimisticLockError si la versión ya no es la guardada. */
  async save(aggregate: TAggregate): Promise<TAggregate> {
    const entity = this.mapper.toPersistence(aggregate);
    return this.write(async (manager) => {
      if (entity.version === undefined) {
        await manager.insert(
          this.entityClass,
          entity as QueryDeepPartialEntity<TEntity>,
        );
      } else {
        await this.writer.update(manager, this.entityClass, entity, {});
      }
      const saved = await manager.findOneByOrFail(this.entityClass, {
        id: entity.id,
      } as FindOptionsWhere<TEntity>);
      return this.mapper.toDomain(saved);
    });
  }

  async remove(id: string): Promise<void> {
    await this.write(async (manager) => {
      await manager.softDelete(this.entityClass, {
        id,
      } as FindOptionsWhere<TEntity>);
    });
  }

  /**
   * Una página según el criterio, con paginación por cursor. El `codec` firma el cursor siguiente; sin él, el
   * cursor no va firmado.
   * @throws CriteriaError `UnknownField` si el criterio nombra un campo que la entidad no tiene.
   */
  async findByCriteria(
    criteria: Criteria<TEntity>,
    codec?: CursorCodec,
  ): Promise<Page<TAggregate>> {
    const ast = criteria.toAst();
    return this.read(async (manager) => {
      const metadata = manager.connection.getMetadata(this.entityClass);
      const translator = new TypeOrmCriteriaTranslator(
        new CriteriaFieldMap(
          'e',
          metadata.columns.map((column) => column.propertyName),
        ),
      );
      const qb = manager.createQueryBuilder(this.entityClass, 'e');
      translator.apply(qb, ast);
      const page = translator.toPage(await qb.getMany(), ast, codec);
      return {
        items: page.items.map((entity) => this.mapper.toDomain(entity)),
        nextCursor: page.nextCursor,
      };
    });
  }
}
