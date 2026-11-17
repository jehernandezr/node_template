import {
  ManagerIntent,
  PersistenceError,
  PersistenceErrorCode,
  SessionSetting,
  type AuditedEntity,
  type RepositoryKit,
} from '@platform/persistence';
import type { EntityManager, EntityTarget } from 'typeorm';

/**
 * Base de los repositorios de datos de tenant (miembros, grupos, roles, invitaciones, API keys). El shard y
 * el tenant salen del `ShardScope` que abre el caso de uso con `inTenantShard`, y toda consulta filtra por
 * ese tenant: un shard aloja varios. Cada consulta corre en una transacción, la abierta o una propia, con
 * `app.tenant_id` fijado al tenant del scope: el RLS de estas tablas falla cerrado sin él, así que una
 * lectura fuera de transacción tampoco ve filas de otros tenants.
 */
export abstract class TenantShardRepository {
  protected constructor(protected readonly kit: RepositoryKit) {}

  protected read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.inTenantSession(fn);
  }

  protected write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.inTenantSession(fn);
  }

  /** @throws PersistenceError `PersistenceTenantRequired` sin `ShardScope` de tenant. */
  protected tenantId(): string {
    const tenantId = this.kit.scope.current()?.tenantId;
    if (tenantId === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantRequired,
        'A tenant ShardScope is required',
      );
    }
    return tenantId;
  }

  /** Inserta con el tenant del scope y el actor del contexto como autor. */
  protected async insertOwned<T extends AuditedEntity>(
    target: EntityTarget<T>,
    entity: T,
  ): Promise<void> {
    entity.tenantId = this.tenantId();
    entity.createdBy = this.kit.context.current().actorId ?? null;
    entity.updatedBy = entity.createdBy;
    await this.write((manager) => manager.insert(target, entity as never));
  }

  /** @throws OptimisticLockError si la fila cambió desde que se leyó. */
  protected async updateOwned<T extends AuditedEntity>(
    target: EntityTarget<T>,
    entity: T,
  ): Promise<void> {
    const tenantId = this.tenantId();
    entity.tenantId = tenantId;
    entity.updatedBy = this.kit.context.current().actorId ?? null;
    await this.write((manager) =>
      this.kit.writer.update(manager, target, entity, { tenantId }),
    );
  }

  /**
   * Corre en la transacción abierta o en una nueva del primario, con el tenant del scope en la sesión. Sin
   * scope de tenant la sesión queda sin tenant y el RLS no deja ver filas.
   */
  private inTenantSession<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const tenantId = this.kit.scope.current()?.tenantId ?? '';
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      async (manager) => {
        await manager.query('SELECT set_config($1, $2, true)', [
          SessionSetting.TenantId,
          tenantId,
        ]);
        return fn(manager);
      },
    );
  }
}
