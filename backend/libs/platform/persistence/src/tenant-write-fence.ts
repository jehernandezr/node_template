import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import type { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Write barrier of a tenant inside its shard, which guarantees that no write reaches the source
 * after the last round of a relocation. Each write transaction takes a shared advisory lock
 * per tenant before opening and checks whether the tenant has a row in `tenant_write_fences`; the relocation writes that row
 * and then takes the exclusive lock, which waits for the transactions that already entered to finish.
 *
 * The lock is session-level and is taken before `BEGIN`, and the check runs outside the transaction: so the check
 * always sees a row written before the lock was granted, with any isolation level.
 *
 * Maintenance tasks that walk all tenants of a shard take another shared lock, a single one per shard,
 * which the relocation also waits for: a maintenance task does not run on a shard with an unpivoted relocation, and it leaves out the
 * rows of the tenants that already left.
 */
export class TenantWriteFence {
  /** Space of the per-tenant advisory locks, to avoid colliding with other two-integer locks. */
  private static readonly LOCK_SPACE = 0x5446;
  private static readonly LOCK_KEY = `${TenantWriteFence.LOCK_SPACE}, hashtext($1)`;
  private static readonly MAINTENANCE_LOCK_KEY = `${TenantWriteFence.LOCK_SPACE + 1}, 0`;
  private static readonly RETRY_AFTER_SECONDS = 1;

  /**
   * SQL condition that leaves out the rows of the tenants with a barrier on this shard, for maintenance tasks.
   * @param tenantExpression SQL expression with the tenant id of the row, qualified with its table or alias (for
   *   example `"tasks"."tenant_id"`): unqualified, `tenant_id` would be the barrier column.
   * @returns The SQL condition.
   */
  static unfenced(tenantExpression: string): string {
    return `NOT EXISTS (SELECT 1 FROM tenant_write_fences twf WHERE twf.tenant_id = (${tenantExpression})::text)`;
  }

  /**
   * Takes the tenant's shared lock in the session and checks that the tenant has no barrier.
   * @param runner Session of the write.
   * @param tenantId Tenant written.
   * @throws ShardingError `TenantMigrating` if it has one; in that case it has already released the lock.
   */
  async admit(runner: QueryRunner, tenantId: string): Promise<void> {
    await runner.query(
      `SELECT pg_advisory_lock_shared(${TenantWriteFence.LOCK_KEY})`,
      [tenantId],
    );
    let fenced: boolean;
    try {
      fenced = await this.isRaised(runner, tenantId);
    } catch (error) {
      await this.leave(runner, tenantId);
      throw error;
    }
    if (fenced) {
      await this.leave(runner, tenantId);
      throw TenantWriteFence.migrating({ tenantId });
    }
  }

  /**
   * Releases the shared lock that `admit` took in the same session.
   * @param runner Session of the write.
   * @param tenantId Tenant written.
   */
  async leave(runner: QueryRunner, tenantId: string): Promise<void> {
    await runner.query(
      `SELECT pg_advisory_unlock_shared(${TenantWriteFence.LOCK_KEY})`,
      [tenantId],
    );
  }

  /**
   * Inside a maintenance transaction: takes the shard maintenance lock until the end of the
   * transaction and checks that no relocation is halfway through on it.
   * @param manager Manager of the maintenance transaction.
   * @throws ShardingError `TenantMigrating` if some tenant has an unpivoted barrier; the maintenance is repeated in
   *   the next run.
   */
  async enterMaintenance(manager: EntityManager): Promise<void> {
    await manager.query(
      `SELECT pg_advisory_xact_lock_shared(${TenantWriteFence.MAINTENANCE_LOCK_KEY})`,
    );
    const rows: { tenant_id: string }[] = await manager.query(
      'SELECT tenant_id FROM tenant_write_fences WHERE switched_at IS NULL LIMIT 1',
    );
    const [moving] = rows;
    if (moving !== undefined) {
      throw TenantWriteFence.migrating({ tenantId: moving.tenant_id });
    }
  }

  /**
   * Raises the tenant barrier for the relocation and waits for the write transactions and the
   * maintenance tasks that had already entered to finish. On return, no write of the tenant can reach this shard.
   * Idempotent; if the tenant had the barrier of a previous relocation, it becomes this one's.
   * @param dataSource Source shard.
   * @param tenantId Moving tenant.
   * @param moveId Relocation.
   */
  async raise(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    const runner = dataSource.createQueryRunner('master');
    try {
      await runner.query(
        `INSERT INTO tenant_write_fences (tenant_id, move_id, created_at, switched_at) VALUES ($1, $2, now(), NULL)
           ON CONFLICT (tenant_id) DO UPDATE SET move_id = EXCLUDED.move_id, created_at = EXCLUDED.created_at, switched_at = NULL
           WHERE tenant_write_fences.move_id <> EXCLUDED.move_id`,
        [tenantId, moveId],
      );
      await TenantWriteFence.waitFor(runner, TenantWriteFence.LOCK_KEY, [
        tenantId,
      ]);
      await TenantWriteFence.waitFor(
        runner,
        TenantWriteFence.MAINTENANCE_LOCK_KEY,
        [],
      );
    } finally {
      await runner.release();
    }
  }

  /**
   * Records that the relocation already pivoted: the tenant lives on another shard and its rows here only await cleanup.
   * @param dataSource Source shard.
   * @param tenantId Moved tenant.
   * @param moveId Relocation.
   */
  async markSwitched(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await dataSource.query(
      'UPDATE tenant_write_fences SET switched_at = now() WHERE tenant_id = $1 AND move_id = $2 AND switched_at IS NULL',
      [tenantId, moveId],
    );
  }

  /**
   * Returns the relocation that raised the tenant barrier on this shard, or `undefined` if there is no barrier.
   * @param dataSource Shard to read.
   * @param tenantId Tenant to check.
   * @returns The move id, or `undefined`.
   */
  async raisedBy(
    dataSource: DataSource,
    tenantId: string,
  ): Promise<string | undefined> {
    const rows: { move_id: string }[] = await dataSource.query(
      'SELECT move_id FROM tenant_write_fences WHERE tenant_id = $1',
      [tenantId],
    );
    return rows[0]?.move_id;
  }

  /**
   * Returns the relocation that raised a barrier here and has not pivoted yet, or `undefined` if none is in flight.
   * @param dataSource Shard to read.
   * @param tenantId Tenant to check.
   * @returns The move id, or `undefined`.
   */
  async unswitchedBy(
    dataSource: DataSource,
    tenantId: string,
  ): Promise<string | undefined> {
    const rows: { move_id: string }[] = await dataSource.query(
      'SELECT move_id FROM tenant_write_fences WHERE tenant_id = $1 AND switched_at IS NULL',
      [tenantId],
    );
    return rows[0]?.move_id;
  }

  /**
   * Lowers the barrier raised by that relocation, for example when canceling it or cleaning up the source. Idempotent.
   * @param dataSource Shard of the barrier.
   * @param tenantId Tenant of the barrier.
   * @param moveId Relocation that raised it.
   */
  async lower(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await dataSource.query(
      'DELETE FROM tenant_write_fences WHERE tenant_id = $1 AND move_id = $2',
      [tenantId, moveId],
    );
  }

  /**
   * Lowers any barrier of the tenant, the one from a previous relocation that moved it off this shard to which it now returns.
   * @param dataSource Shard of the barrier.
   * @param tenantId Tenant of the barrier.
   */
  async lowerAny(dataSource: DataSource, tenantId: string): Promise<void> {
    await dataSource.query(
      'DELETE FROM tenant_write_fences WHERE tenant_id = $1',
      [tenantId],
    );
  }

  private async isRaised(
    runner: QueryRunner,
    tenantId: string,
  ): Promise<boolean> {
    const rows: { fenced: boolean }[] = await runner.query(
      'SELECT EXISTS (SELECT 1 FROM tenant_write_fences WHERE tenant_id = $1) AS fenced',
      [tenantId],
    );
    return rows[0]?.fenced === true;
  }

  /** Takes the exclusive lock and releases it: returns when nobody holds the shared one anymore. */
  private static async waitFor(
    runner: QueryRunner,
    key: string,
    params: readonly string[],
  ): Promise<void> {
    await runner.query(`SELECT pg_advisory_lock(${key})`, [...params]);
    await runner.query(`SELECT pg_advisory_unlock(${key})`, [...params]);
  }

  private static migrating(details: { tenantId: string }): ShardingError {
    return new ShardingError(
      ShardingErrorCode.TenantMigrating,
      'Tenant is migrating; its writes moved to another shard',
      {
        details: {
          ...details,
          retryAfterSeconds: TenantWriteFence.RETRY_AFTER_SECONDS,
        },
      },
    );
  }
}
