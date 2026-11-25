import type { ShardDataSources } from '@platform/persistence';
import type { DirectoryStore, TenantPlacement } from '@platform/sharding';
import type { DataSource } from 'typeorm';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../transfer/batch/sql-identifier.js';
import { TenantRowFilter } from '../transfer/batch/tenant-row-filter.js';
import { TenantSession } from '../transfer/batch/tenant-session.js';
import { TenantDataPresence } from './tenant-data-presence.js';

/**
 * Busca filas del tenant en las tablas del manifiesto del servicio, shard por shard de su placement. Solo las del
 * servicio: las de la plataforma (outbox, llaves de idempotencia, sagas) llevan filas del tenant desde su alta y no
 * son sus datos.
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

  /** Si alguna tabla del manifiesto tiene al menos una fila del tenant en algún shard de su placement. */
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
