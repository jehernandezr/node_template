import { PlatformErrorCode } from '@contracts/platform';
import type { Criteria, CursorCodec, Page } from '@platform/criteria';
import {
  type EntityManager,
  type EntityTarget,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import type { AuditedEntity } from './entities/audited-entity.js';
import { PersistenceError } from './errors.js';
import { CriteriaFieldMap } from './criteria-field-map.js';
import type { EntityMapper } from './model/entity-mapper.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { RepositoryKit } from './repository-kit.js';
import { TypeOrmCriteriaTranslator } from './typeorm-criteria-translator.js';

/**
 * Base de los repositorios de un módulo con datos por shard. El servicio la extiende, implementa el
 * puerto del dominio y suma sus consultas con `this.read(...)`. Aplica el tenant del contexto, la versión
 * optimista (`@VersionColumn`), el borrado lógico (`@DeleteDateColumn`), la auditoría y `Criteria`.
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

  /** Lee con el manager de la transacción actual o, fuera de ella, el de la réplica del shard. */
  protected read<T>(
    fn: (manager: EntityManager) => Promise<T>,
    source?: unknown,
  ): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, source, intent: ManagerIntent.Read },
      fn,
    );
  }

  /** Igual que `read`, pero contra el primario, para leer lo recién confirmado. */
  protected readPrimary<T>(
    fn: (manager: EntityManager) => Promise<T>,
    source?: unknown,
  ): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, source, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  /** Escribe dentro de una transacción del primario: se une a la abierta o abre una. */
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
   * Tenant dueño de los datos: el del `ShardScope` activo o, sin scope, el del contexto. Un shard aloja
   * varios tenants, así que toda consulta propia del repositorio filtra por él.
   * @throws PersistenceError `PersistenceTenantRequired` si no hay ninguno.
   */
  protected tenantId(): string {
    const tenantId =
      this.kit.scope.current()?.tenantId ?? this.kit.context.current().tenantId;
    if (tenantId === undefined) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceTenantRequired,
        'The request context has no tenant',
      );
    }
    return tenantId;
  }

  /** Agregado por id del tenant del contexto, o `null` si no existe o está borrado. */
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
   * Guarda el agregado. Sin `version` inserta; con `version` actualiza solo si sigue vigente.
   * @throws PersistenceError `PersistenceTenantRequired` si el contexto no trae tenant.
   * @throws OptimisticLockError si la versión ya no es la guardada.
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
        PlatformErrorCode.PersistenceTenantMismatch,
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

  /** Borrado lógico de la fila del tenant del contexto. No hace nada si no existe. */
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
   * Una página según el criterio, del tenant del contexto, con paginación por cursor. El `codec` firma el cursor
   * siguiente; sin él, el cursor no va firmado.
   * @throws CriteriaError `UnknownField` si el criterio nombra un campo que la entidad no tiene.
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
