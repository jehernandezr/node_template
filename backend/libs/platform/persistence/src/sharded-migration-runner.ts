import type { DataSource } from 'typeorm';
import type { CatalogDataSource } from './catalog-data-source.js';
import type { MigrationReport } from './model/migration-report.js';
import type { ShardLocation } from './model/shard-location.js';
import type { ShardLister } from './ports/shard-lister.js';
import type { ShardDataSources } from './shard-data-sources.js';

/**
 * Runs the pending migrations of the catalog and of each logical shard, each database under
 * `pg_advisory_lock` so two processes do not apply them at the same time. Used by the `migrate` binary of each app.
 */
export class ShardedMigrationRunner {
  /** `pg_advisory_lock` key of the platform migrations. */
  static readonly LOCK_KEY = 7_948_310_215_002;

  constructor(
    private readonly lister: ShardLister,
    private readonly sources: ShardDataSources,
    private readonly catalog: CatalogDataSource,
  ) {}

  /**
   * Catalog first, then each shard in order. Databases are migrated one by one: a failure stops the run
   * and the already migrated databases stay up to date. Repeating it never applies anything twice.
   * @returns One report per database.
   */
  async migrateAll(): Promise<readonly MigrationReport[]> {
    const reports: MigrationReport[] = [await this.migrateCatalog()];
    for (const location of await this.lister.list()) {
      reports.push(await this.migrateShard(location));
    }
    return reports;
  }

  /**
   * Migrates the catalog.
   * @returns The report.
   */
  async migrateCatalog(): Promise<MigrationReport> {
    return this.migrate(await this.catalog.get());
  }

  /**
   * Migrates one shard.
   * @param location Shard to migrate.
   * @returns The report.
   */
  async migrateShard(location: ShardLocation): Promise<MigrationReport> {
    return this.migrate(await this.sources.get(location));
  }

  /**
   * Takes the lock on a dedicated connection and runs the migrations on another one from the pool. The lock is per
   * database, so two processes that migrate the same database take turns.
   */
  private async migrate(dataSource: DataSource): Promise<MigrationReport> {
    const runner = dataSource.createQueryRunner('master');
    await runner.connect();
    try {
      await runner.query('SELECT pg_advisory_lock($1)', [
        ShardedMigrationRunner.LOCK_KEY,
      ]);
      try {
        const applied = await dataSource.runMigrations({ transaction: 'each' });
        return {
          database: ShardedMigrationRunner.databaseOf(dataSource),
          applied: applied.map((migration) => migration.name),
        };
      } finally {
        await runner.query('SELECT pg_advisory_unlock($1)', [
          ShardedMigrationRunner.LOCK_KEY,
        ]);
      }
    } finally {
      await runner.release();
    }
  }

  /**
   * Name of the database being migrated. With replicas, TypeORM leaves `options.database` unset and the
   * name lives in `replication.master`.
   */
  private static databaseOf(dataSource: DataSource): string {
    const { options } = dataSource;
    if (options.type === 'postgres' && options.replication !== undefined) {
      return String(options.replication.master.database);
    }
    return String(options.database);
  }
}
