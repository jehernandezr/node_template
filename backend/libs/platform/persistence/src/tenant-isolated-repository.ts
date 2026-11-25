import type { EntityManager, EntityTarget } from 'typeorm';
import type { AuditedEntity } from './entities/audited-entity.js';
import { SessionSetting } from './enums.js';
import { PersistenceError } from './errors/persistence-error.js';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { RepositoryKit } from './repository-kit.js';

/**
 * Base of the repositories of tenant tables with RLS (`TenantIsolationSql`). The shard and the tenant come from the
 * `ShardScope` opened by the use case, and every query also filters by that tenant: a shard hosts several.
 * Each query runs in a transaction with `app.tenant_id` set, because RLS fails closed without it.
 * Reads outside an open transaction go to the replica in a read-only transaction; those that
 * must see what was just committed use `readPrimary`.
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

  /** @throws PersistenceError `PersistenceTenantRequired` without a tenant `ShardScope`. */
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

  /** Inserts with the scope tenant and the context actor as author. */
  protected async insertOwned<T extends AuditedEntity>(
    target: EntityTarget<T>,
    entity: T,
  ): Promise<void> {
    entity.tenantId = this.tenantId();
    entity.createdBy = this.kit.context.current().actorId ?? null;
    entity.updatedBy = entity.createdBy;
    await this.write((manager) => manager.insert(target, entity as never));
  }

  /** @throws OptimisticLockError if the row changed since it was read. */
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
