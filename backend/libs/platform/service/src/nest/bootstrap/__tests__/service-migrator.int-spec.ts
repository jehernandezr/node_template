import { ContainerRuntime } from '@platform/kernel/test-utils';
import { MigrationTarget } from '../../../migration-target.enum.js';
import {
  ServiceDefinitionBuilder,
  ServicePostgresServer,
  type ServiceDatabases,
} from '../../../__tests__/utils/index.js';
import { ServiceMigrator } from '../service-migrator.js';
import { CatalogProbeMigration1900000000001 } from './utils/catalog-probe-migration.js';
import { ShardBlockerMigration1900000000003 } from './utils/shard-blocker-migration.js';
import { ShardProbeMigration1900000000002 } from './utils/shard-probe-migration.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('ServiceMigrator over PostgreSQL', () => {
  const SERVICE = 'migrator-probe';
  const PLATFORM_CATALOG_MIGRATION = 'CreatePlatformCatalogTables1794800001101';
  const catalogProbe = new CatalogProbeMigration1900000000001().name;
  const shardProbe = new ShardProbeMigration1900000000002().name;
  const shardBlocker = new ShardBlockerMigration1900000000003().name;

  const migrator = new ServiceMigrator();
  const server = new ServicePostgresServer();
  const baseDefinition = ServiceDefinitionBuilder.aDefinition(SERVICE)
    .with({
      migrations: {
        catalog: {
          entities: [],
          migrations: [CatalogProbeMigration1900000000001],
        },
        shard: { entities: [], migrations: [ShardProbeMigration1900000000002] },
      },
    })
    .build();
  const blockerDefinition = ServiceDefinitionBuilder.aDefinition(SERVICE)
    .with({
      migrations: {
        catalog: {
          entities: [],
          migrations: [CatalogProbeMigration1900000000001],
        },
        shard: {
          entities: [],
          migrations: [
            ShardProbeMigration1900000000002,
            ShardBlockerMigration1900000000003,
          ],
        },
      },
    })
    .build();

  /** Bases nuevas con el catálogo migrado y los dos shards anotados en su directorio. */
  const withRegisteredShards = async (): Promise<ServiceDatabases> => {
    const databases = await server.provision();
    await migrator.run(baseDefinition, MigrationTarget.Catalog, {
      env: databases.environment(SERVICE),
    });
    await databases.registerShards();
    return databases;
  };

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('catalog target', () => {
    it('applies the platform and service catalog migrations', async () => {
      const databases = await server.provision();

      const report = await migrator.run(
        baseDefinition,
        MigrationTarget.Catalog,
        { env: databases.environment(SERVICE) },
      );

      expect(report.databases).toHaveLength(1);
      expect(report.databases[0]?.applied).toEqual(
        expect.arrayContaining([PLATFORM_CATALOG_MIGRATION, catalogProbe]),
      );
    });
  });

  describe('shards target', () => {
    it('applies the service shard migration on every shard of the directory', async () => {
      const databases = await withRegisteredShards();

      const report = await migrator.run(
        baseDefinition,
        MigrationTarget.Shards,
        { env: databases.environment(SERVICE) },
      );

      expect(report.databases.map((database) => database.applied)).toEqual([
        expect.arrayContaining([shardProbe]),
        expect.arrayContaining([shardProbe]),
      ]);
      await expect(
        databases.shards[1].rows(
          `SELECT name FROM migrations WHERE name = '${shardProbe}'`,
        ),
      ).resolves.toHaveLength(1);
    });

    it('stops at the failing shard, keeps the shards already migrated and resumes after the fix', async () => {
      const databases = await withRegisteredShards();
      const [first, second] = databases.shards;
      const env = databases.environment(SERVICE);
      await second.query('CREATE TABLE service_shard_blocker (id int)');

      await expect(
        migrator.run(blockerDefinition, MigrationTarget.Shards, { env }),
      ).rejects.toThrow();

      await expect(
        first.rows(
          `SELECT name FROM migrations WHERE name = '${shardBlocker}'`,
        ),
      ).resolves.toHaveLength(1);
      await expect(
        second.rows(
          `SELECT name FROM migrations WHERE name = '${shardBlocker}'`,
        ),
      ).resolves.toHaveLength(0);

      await second.query('DROP TABLE service_shard_blocker');
      const report = await migrator.run(
        blockerDefinition,
        MigrationTarget.Shards,
        { env },
      );

      expect(report.databases.map((database) => database.applied)).toEqual([
        [],
        expect.arrayContaining([shardBlocker]),
      ]);
    });
  });

  describe('all target', () => {
    it('migrates the catalog first and then every shard', async () => {
      const databases = await withRegisteredShards();

      const report = await migrator.run(baseDefinition, MigrationTarget.All, {
        env: databases.environment(SERVICE),
      });

      expect(report.databases.map((database) => database.applied)).toEqual([
        [],
        expect.arrayContaining([shardProbe]),
        expect.arrayContaining([shardProbe]),
      ]);
    });

    it('applies nothing when every database is up to date', async () => {
      const databases = await withRegisteredShards();
      const env = databases.environment(SERVICE);
      await migrator.run(baseDefinition, MigrationTarget.All, { env });

      const report = await migrator.run(baseDefinition, MigrationTarget.All, {
        env,
      });

      expect(report.databases.map((database) => database.applied)).toEqual([
        [],
        [],
        [],
      ]);
    });
  });
});
