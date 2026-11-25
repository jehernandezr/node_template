import type { ShardDataSources } from '@platform/persistence';
import type { DirectoryStore, TenantPlacement } from '@platform/sharding';
import type { DataSource } from 'typeorm';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../transfer/batch/sql-identifier.js';
import { TenantRowFilter } from '../transfer/batch/tenant-row-filter.js';
import { TenantSession } from '../transfer/batch/tenant-session.js';
import { TenantDataPresence } from './tenant-data-presence.js';

/**
 * Looks for tenant rows in the service manifest tables, shard by shard of its placement. Only the
 * service ones: the platform ones (outbox, idempotency keys, sagas) hold tenant rows from its sign-up and are not
 * its data.
 */
export class ManifestTenantDataPresence extends TenantDataPresence {
  private readonly filter: TenantRowFilter;
  private readonly session = new TenantSession();

  constructor(
    private readonly manifest: TenantMoveManifest,
    private readonly directory: DirectoryStore,
    private readonly sources: ShardDataSources,
  ) {
    super();
    this.filter = new TenantRowFilter(manifest);
  }

  /** Whether any manifest table has at least one tenant row on any shard of its placement. */
  async holdsData(placement: TenantPlacement): Promise<boolean> {
    for (const shard of placement.shardGroup) {
      const instance = await this.directory.getInstance(shard);
      if (instance === undefined) {
        continue;
      }
      const dataSource = await this.sources.get({
        logicalShard: shard,
        instance,
      });
      if (await this.holdsDataIn(placement.tenantId, dataSource)) {
        return true;
      }
    }
    return false;
  }

  private holdsDataIn(
    tenantId: string,
    dataSource: DataSource,
  ): Promise<boolean> {
    return this.session.run(dataSource, tenantId, async (runner) => {
      for (const entry of this.manifest.tables()) {
        const rows: unknown[] = await runner.query(
          `SELECT 1 FROM ${SqlIdentifier.quoteTable(entry.table)} t WHERE ${this.filter.where(entry.table, 't')} LIMIT 1`,
          [tenantId],
        );
        if (rows.length > 0) {
          return true;
        }
      }
      return false;
    });
  }
}
