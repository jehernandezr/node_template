import { TenantWriteFence } from '@platform/persistence';
import { ShardingError } from '@platform/sharding';
import type { DataSource } from 'typeorm';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../../transfer/batch/sql-identifier.js';
import type { TenantRowFilter } from '../../transfer/batch/tenant-row-filter.js';
import type { ManifestRowSeeder } from './manifest-row-seeder.js';

/**
 * Writes a tenant's rows in every manifest table as a service would while the tenant moves: each write goes through
 * the tenant fence, in its own transaction with the tenant in the session. A write adds a row to each table, when the
 * service allows more than one per tenant, and touches `updated_at` of one tenant row of each table that has one.
 */
export class ManifestRowWriter {
  private readonly fence = new TenantWriteFence();
  private touched: readonly string[] | undefined;
  private acknowledged = 0;
  private rejections = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantId: string,
    private readonly manifest: TenantMoveManifest,
    private readonly filter: TenantRowFilter,
    private readonly seeder: ManifestRowSeeder,
    private readonly inserts: boolean,
  ) {}

  /**
   * Writes once through the fence.
   * @returns `false` if the fence rejected the write because the tenant is frozen.
   */
  async writeOnce(): Promise<boolean> {
    const tables = await this.tablesWithUpdatedAt();
    const runner = this.dataSource.createQueryRunner('master');
    try {
      await runner.connect();
      await this.fence.admit(runner, this.tenantId);
    } catch (error) {
      await runner.release();
      if (error instanceof ShardingError) {
        this.rejections += 1;
        return false;
      }
      throw error;
    }
    try {
      await runner.startTransaction();
      await runner.query("SELECT set_config('app.tenant_id', $1, true)", [
        this.tenantId,
      ]);
      if (this.inserts) {
        await this.seeder.seed(runner, this.tenantId, 1);
      }
      for (const table of tables) {
        await runner.query(
          `UPDATE ${SqlIdentifier.quoteTable(table)} SET "updated_at" = clock_timestamp() WHERE ctid = (SELECT t.ctid FROM ${SqlIdentifier.quoteTable(table)} t WHERE ${this.filter.where(table, 't')} ORDER BY random() LIMIT 1)`,
          [this.tenantId],
        );
      }
      await runner.commitTransaction();
      this.acknowledged += 1;
      return true;
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      throw error;
    } finally {
      await this.fence.leave(runner, this.tenantId);
      await runner.release();
    }
  }

  /**
   * Counts the writes that committed.
   * @returns How many writes the fence let through and committed.
   */
  acked(): number {
    return this.acknowledged;
  }

  /**
   * Counts the writes the fence turned away.
   * @returns How many writes found the tenant frozen.
   */
  rejected(): number {
    return this.rejections;
  }

  private async tablesWithUpdatedAt(): Promise<readonly string[]> {
    if (this.touched !== undefined) {
      return this.touched;
    }
    const tables: string[] = [];
    for (const entry of this.manifest.tables()) {
      const [name, schema] = entry.table.includes('.')
        ? [entry.table.split('.')[1], entry.table.split('.')[0]]
        : [entry.table, null];
      const rows: unknown[] = await this.dataSource.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'updated_at' AND table_schema = COALESCE($2, current_schema())`,
        [name, schema],
      );
      if (rows.length > 0) {
        tables.push(entry.table);
      }
    }
    this.touched = tables;
    return tables;
  }
}
