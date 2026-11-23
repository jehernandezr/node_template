import type { EntityManager, EntityTarget } from 'typeorm';
import type { AuditedEntity } from './entities/audited-entity.js';
import { SessionSetting } from './enums.js';
import { PersistenceError } from './errors/persistence-error.js';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { RepositoryKit } from './repository-kit.js';

/**
 * Base de los repositorios de tablas de tenant con RLS (`TenantIsolationSql`). El shard y el tenant salen del
 * `ShardScope` que abre el caso de uso, y toda consulta filtra además por ese tenant: un shard aloja varios.
 * Cada consulta corre en una transacción con `app.tenant_id` fijado, porque el RLS falla cerrado sin él.
 * Las lecturas fuera de una transacción abierta van a la réplica en una transacción de solo lectura; las que
 * deben ver lo recién confirmado usan `readPrimary`.
 */
export abstract class TenantIsolatedRepository {
  protected constructor(protected readonly kit: RepositoryKit) {}

  protected read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.inTenantSession(ManagerIntent.Read, fn);
  }

  protected readPrimary<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.inTenantSession(ManagerIntent.ReadPrimary, fn);
  }

  protected write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.inTenantSession(ManagerIntent.Write, fn);
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

  private inTenantSession<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const tenantId = this.kit.scope.current()?.tenantId ?? '';
    return this.kit.provider.run(
      { feature: this.kit.feature, intent },
      async (manager) => {
        if (manager.queryRunner?.isTransactionActive === true) {
          await TenantIsolatedRepository.bindTenant(manager, tenantId);
          return fn(manager);
        }
        return manager.transaction(async (transaction) => {
          await transaction.query('SET TRANSACTION READ ONLY');
          await TenantIsolatedRepository.bindTenant(transaction, tenantId);
          return fn(transaction);
        });
      },
    );
  }

  private static async bindTenant(
    manager: EntityManager,
    tenantId: string,
  ): Promise<void> {
    await manager.query('SELECT set_config($1, $2, true)', [
      SessionSetting.TenantId,
      tenantId,
    ]);
  }
}
