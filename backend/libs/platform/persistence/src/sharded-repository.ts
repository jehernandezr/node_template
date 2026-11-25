import type { Criteria, CursorCodec, Page } from '@platform/criteria';
import {
  type EntityManager,
  type EntityTarget,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import type { AuditedEntity } from './entities/audited-entity.js';
import { PersistenceError } from './errors/persistence-error.js';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import { CriteriaFieldMap } from './criteria-field-map.js';
import type { EntityMapper } from './model/entity-mapper.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { RepositoryKit } from './repository-kit.js';
import { TypeOrmCriteriaTranslator } from './typeorm-criteria-translator.js';

/**
 * Base of the repositories of a module with per-shard data. The service extends it, implements the
 * domain port and adds its queries with `this.read(...)`. Applies the context tenant, optimistic
 * versioning (`@VersionColumn`), soft delete (`@DeleteDateColumn`), audit and `Criteria`.
 */
export abstract class ShardedRepository<
  TAggregate,
  TEntity extends AuditedEntity,
> {
  protected constructor(
    protected readonly entityClass: EntityTarget<TEntity>,
    protected readonly kit: RepositoryKit,
    protected readonly mapper: EntityMapper<TAggregate, TEntity>,
  ) {}

  /** Reads with the manager of the current transaction or, outside of one, the one of the shard replica. */
  protected read<T>(
    fn: (manager: EntityManager) => Promise<T>,
    source?: unknown,
  ): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, source, intent: ManagerIntent.Read },
      fn,
    );
  }

  /** Same as `read`, but against the primary, to read what was just committed. */
  protected readPrimary<T>(
    fn: (manager: EntityManager) => Promise<T>,
    source?: unknown,
  ): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, source, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  /** Writes inside a primary transaction: joins the open one or opens one. */
  protected write<T>(
    fn: (manager: EntityManager) => Promise<T>,
    source?: unknown,
  ): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, source, intent: ManagerIntent.Write },
      fn,
    );
  }

  /**
   * Tenant that owns the data: the one of the active `ShardScope` or, without a scope, the one of the context. A shard hosts
   * several tenants, so every query of the repository itself filters by it.
   * @throws PersistenceError `PersistenceTenantRequired` if there is none.
   */
  protected tenantId(): string {
    const tenantId =
      this.kit.scope.current()?.tenantId ?? this.kit.context.current().tenantId;
    if (tenantId === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantRequired,
        'The request context has no tenant',
      );
    }
    return tenantId;
  }

  /** Returns the aggregate by id of the context tenant, or `null` if it does not exist or is deleted. */
  async findById(id: string, source?: unknown): Promise<TAggregate | null> {
    const tenantId = this.tenantId();
    const entity = await this.read(
      (manager) =>
        manager.findOneBy(this.entityClass, {
          id,
          tenantId,
        } as FindOptionsWhere<TEntity>),
      source,
    );
    return entity === null ? null : this.mapper.toDomain(entity);
  }

  /**
   * Saves the aggregate. Without `version` it inserts; with `version` it updates only if it is still current.
   * @throws PersistenceError `PersistenceTenantRequired` if the context has no tenant.
   * @throws OptimisticLockError if the version is no longer the stored one.
   */
  async save(aggregate: TAggregate): Promise<TAggregate> {
    const entity = this.mapper.toPersistence(aggregate);
    const tenantId = this.tenantId();
    const declaredTenant: string | undefined = entity.tenantId;
    if (
      declaredTenant !== undefined &&
      declaredTenant !== '' &&
      declaredTenant !== tenantId
    ) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantMismatch,
        'The entity belongs to another tenant',
      );
    }
    entity.tenantId = tenantId;
    const actorId = this.kit.context.current().actorId ?? null;
    entity.updatedBy = actorId;

    return this.write(async (manager) => {
      if (entity.version === undefined) {
        entity.createdBy = actorId;
        await manager.insert(
          this.entityClass,
          entity as QueryDeepPartialEntity<TEntity>,
        );
      } else {
        await this.kit.writer.update(manager, this.entityClass, entity, {
          tenantId,
        });
      }
      const saved = await manager.findOneByOrFail(this.entityClass, {
        id: entity.id,
        tenantId,
      } as FindOptionsWhere<TEntity>);
      return this.mapper.toDomain(saved);
    }, entity);
  }

  /** Soft-deletes the row of the context tenant. Does nothing if it does not exist. */
  async remove(id: string, source?: unknown): Promise<void> {
    const tenantId = this.tenantId();
    await this.write(async (manager) => {
      await manager.softDelete(this.entityClass, {
        id,
        tenantId,
      } as FindOptionsWhere<TEntity>);
    }, source);
  }

  /**
   * Returns a page according to the criteria, of the context tenant, with cursor pagination. The `codec` signs the next
   * cursor; without it, the cursor is not signed.
   * @throws CriteriaError `UnknownField` if the criteria names a field the entity does not have.
   */
  async findByCriteria(
    criteria: Criteria<TEntity>,
    codec?: CursorCodec,
  ): Promise<Page<TAggregate>> {
    const tenantId = this.tenantId();
    const ast = criteria.toAst();
    return this.read(async (manager) => {
      const metadata = manager.connection.getMetadata(this.entityClass);
      const translator = new TypeOrmCriteriaTranslator(
        new CriteriaFieldMap(
          'e',
          metadata.columns.map((column) => column.propertyName),
        ),
      );
      const qb = manager
        .createQueryBuilder(this.entityClass, 'e')
        .where('e.tenantId = :tenantId', { tenantId });
      translator.apply(qb, ast);
      const page = translator.toPage(await qb.getMany(), ast, codec);
      return {
        items: page.items.map((entity) => this.mapper.toDomain(entity)),
        nextCursor: page.nextCursor,
      };
    });
  }
}
