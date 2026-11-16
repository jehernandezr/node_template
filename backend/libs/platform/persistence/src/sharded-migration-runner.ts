import type { DataSource } from 'typeorm';
import type { CatalogDataSource } from './catalog-data-source.js';
import type { MigrationReport } from './model/migration-report.js';
import type { ShardLocation } from './model/shard-location.js';
import type { ShardLister } from './ports/shard-lister.js';
import type { ShardDataSources } from './shard-data-sources.js';

/**
 * Corre las migraciones pendientes del catálogo y de cada shard lógico, cada base bajo
 * `pg_advisory_lock` para que dos procesos no las apliquen a la vez. Lo usa el binario `migrate` de cada app.
 */
export class ShardedMigrationRunner {
  /** Llave de `pg_advisory_lock` de las migraciones de la plataforma. */
  static readonly LOCK_KEY = 7_948_310_215_002;

  constructor(
    private readonly lister: ShardLister,
    private readonly sources: ShardDataSources,
    private readonly catalog: CatalogDataSource,
  ) {}

  /**
   * Catálogo primero, luego cada shard en orden. Las bases se migran una a una: un fallo corta la corrida
   * y las bases ya migradas quedan al día. Repetirlo no aplica nada dos veces.
   */
  async migrateAll(): Promise<readonly MigrationReport[]> {
    const reports: MigrationReport[] = [await this.migrateCatalog()];
    for (const location of await this.lister.list()) {
      reports.push(await this.migrateShard(location));
    }
    return reports;
  }

  async migrateCatalog(): Promise<MigrationReport> {
    return this.migrate(await this.catalog.get());
  }

  async migrateShard(location: ShardLocation): Promise<MigrationReport> {
    return this.migrate(await this.sources.get(location));
  }

  /**
   * Toma el lock en una conexión dedicada y corre las migraciones en otra del pool. El lock vale por
   * base, así que dos procesos que migran la misma base se turnan.
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
   * Nombre de la base que se migra. Con réplicas, TypeORM deja `options.database` sin valor y el
   * nombre vive en `replication.master`.
   */
  private static databaseOf(dataSource: DataSource): string {
    const { options } = dataSource;
    if (options.type === 'postgres' && options.replication !== undefined) {
      return String(options.replication.master.database);
    }
    return String(options.database);
  }
}
