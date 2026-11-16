import { Migration } from 'typeorm';
import { CatalogDataSource } from '../catalog-data-source.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { ShardedMigrationRunner } from '../sharded-migration-runner.js';
import { FakeDataSourceFactory } from './utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './utils/fake-instance-endpoint-resolver.js';
import { FixedClock } from '@platform/kernel/test-utils';
import { StaticShardLister } from './utils/static-shard-lister.js';
import { StubDataSource } from './utils/stub-data-source.js';

const INSTANCE = 'test-instance';
const LOCK_KEY = 7_948_310_215_002;
const LOCK_CALLS = [
  'connect',
  `query SELECT pg_advisory_lock($1) [${LOCK_KEY}]`,
  `query SELECT pg_advisory_unlock($1) [${LOCK_KEY}]`,
  'release',
];

/**
 * Base de prueba que aplica las migraciones pendientes una sola vez: la segunda corrida no aplica
 * nada. Si `failure` está definido, `runMigrations` rechaza con ese error.
 */
class MigratingDataSource extends StubDataSource {
  private readonly pending: string[];
  private readonly failure?: Error;

  constructor(label: string, pending: readonly string[] = [], failure?: Error) {
    super(label, []);
    this.pending = [...pending];
    this.failure = failure;
  }

  override runMigrations(): Promise<Migration[]> {
    if (this.failure !== undefined) {
      return Promise.reject(this.failure);
    }
    const applied = this.pending.splice(0);
    return Promise.resolve(
      applied.map((name) => new Migration(undefined, 0, name)),
    );
  }
}

/** Base de prueba configurada con réplicas: TypeORM deja `options.database` sin valor y el nombre va en `replication.master`. */
class ReplicatedDataSource extends MigratingDataSource {
  constructor(label: string) {
    super(label);
    Object.assign(this, {
      options: {
        type: 'postgres',
        replication: { master: { database: label }, slaves: [] },
      },
    });
  }
}

/** `CatalogDataSource` que entrega una base de prueba. */
class StubCatalogDataSource extends CatalogDataSource {
  constructor(private readonly dataSource: StubDataSource) {
    super(new FakeDataSourceFactory(), new FakeInstanceEndpointResolver(), {
      DB_CATALOG_NAME: 'catalog',
      DB_CATALOG_INSTANCE: INSTANCE,
    });
  }

  override get(): Promise<StubDataSource> {
    return Promise.resolve(this.dataSource);
  }
}

/** `ShardDataSources` que entrega una base de prueba por shard lógico. */
class StubShardDataSources extends ShardDataSources {
  constructor(
    private readonly byShard: Readonly<Record<string, StubDataSource>>,
  ) {
    super(
      new FakeDataSourceFactory(),
      new FakeInstanceEndpointResolver(),
      new FixedClock(),
      {
        idleTtlMs: 60_000,
      },
    );
  }

  override get(location: { logicalShard: string }): Promise<StubDataSource> {
    return Promise.resolve(this.byShard[location.logicalShard]);
  }
}

describe('ShardedMigrationRunner', () => {
  function runnerFor(
    catalogSource: StubDataSource,
    shards: Readonly<Record<string, StubDataSource>>,
  ): ShardedMigrationRunner {
    const lister = new StaticShardLister([
      { logicalShard: 'test_shard_0', instance: INSTANCE },
      { logicalShard: 'test_shard_1', instance: INSTANCE },
    ]);
    return new ShardedMigrationRunner(
      lister,
      new StubShardDataSources(shards),
      new StubCatalogDataSource(catalogSource),
    );
  }

  describe('migrateAll', () => {
    it('migrates the catalog first and then each shard in the lister order', async () => {
      const runner = runnerFor(
        new MigratingDataSource('catalog', ['CreateCatalog1']),
        {
          test_shard_0: new MigratingDataSource('test_shard_0', [
            'CreateProbes1',
          ]),
          test_shard_1: new MigratingDataSource('test_shard_1', [
            'CreateProbes1',
          ]),
        },
      );

      const reports = await runner.migrateAll();

      expect(reports.map((report) => report.database)).toEqual([
        'catalog',
        'test_shard_0',
        'test_shard_1',
      ]);
    });

    it('reports the names of the migrations applied in each database', async () => {
      const first = new MigratingDataSource('catalog', ['CreateCatalog1']);
      const shard = new MigratingDataSource('test_shard_0', [
        'CreateProbes1',
        'Audit2',
      ]);
      const second = new MigratingDataSource('test_shard_1', []);
      const runner = runnerFor(first, {
        test_shard_0: shard,
        test_shard_1: second,
      });

      const reports = await runner.migrateAll();

      expect(reports[0].applied).toEqual(['CreateCatalog1']);
      expect(reports[1].applied).toEqual(['CreateProbes1', 'Audit2']);
      expect(reports[2].applied).toEqual([]);
    });

    it('reports the master database when the data source uses replication', async () => {
      const runner = runnerFor(new ReplicatedDataSource('catalog'), {
        test_shard_0: new ReplicatedDataSource('test_shard_0'),
        test_shard_1: new ReplicatedDataSource('test_shard_1'),
      });

      const reports = await runner.migrateAll();

      expect(reports.map((report) => report.database)).toEqual([
        'catalog',
        'test_shard_0',
        'test_shard_1',
      ]);
    });

    it('applies nothing when a second run finds every database up to date', async () => {
      const first = new MigratingDataSource('catalog', ['CreateCatalog1']);
      const shard = new MigratingDataSource('test_shard_0', ['CreateProbes1']);
      const second = new MigratingDataSource('test_shard_1', ['CreateProbes1']);
      const runner = runnerFor(first, {
        test_shard_0: shard,
        test_shard_1: second,
      });
      await runner.migrateAll();

      const reports = await runner.migrateAll();

      expect(reports.map((report) => report.applied)).toEqual([[], [], []]);
    });

    it('holds the advisory lock on a dedicated connection around each database', async () => {
      const first = new MigratingDataSource('catalog');
      const shard = new MigratingDataSource('test_shard_0');
      const second = new MigratingDataSource('test_shard_1');
      const runner = runnerFor(first, {
        test_shard_0: shard,
        test_shard_1: second,
      });

      await runner.migrateAll();

      expect(first.runners[0].calls).toEqual(LOCK_CALLS);
      expect(shard.runners[0].calls).toEqual(LOCK_CALLS);
      expect(second.runners[0].calls).toEqual(LOCK_CALLS);
    });

    it('releases the lock and the connection even when a migration fails, and surfaces the error', async () => {
      const failing = new MigratingDataSource(
        'test_shard_0',
        [],
        new Error('migration boom'),
      );
      const runner = runnerFor(new MigratingDataSource('catalog'), {
        test_shard_0: failing,
        test_shard_1: new MigratingDataSource('test_shard_1'),
      });

      await expect(runner.migrateAll()).rejects.toThrow('migration boom');

      expect(failing.runners[0].calls).toEqual(LOCK_CALLS);
    });
  });

  describe('migrateCatalog and migrateShard', () => {
    it('migrates one shard on its own', async () => {
      const runner = runnerFor(new MigratingDataSource('catalog'), {
        test_shard_0: new MigratingDataSource('test_shard_0'),
        test_shard_1: new MigratingDataSource('test_shard_1'),
      });

      const report = await runner.migrateShard({
        logicalShard: 'test_shard_1',
        instance: INSTANCE,
      });

      expect(report.database).toBe('test_shard_1');
    });
  });
});
