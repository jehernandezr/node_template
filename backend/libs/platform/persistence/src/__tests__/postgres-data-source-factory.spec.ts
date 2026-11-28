import { DatabaseKind } from '../model/database-kind.enum.js';
import { EntityRegistry } from '../entity-registry.js';
import { PostgresDataSourceFactory } from '../postgres-data-source-factory.js';
import {
  databaseConfigSchema,
  type DatabaseSettings,
} from '../config/database.config.js';
import { ProbeEntity } from './utils/probe.entity.js';

class CatalogOnlyEntity {}

const SHARD_TARGET = {
  kind: DatabaseKind.Shard,
  instance: 'db-1',
  database: 'svc_shard_0',
};
const CATALOG_TARGET = {
  kind: DatabaseKind.Catalog,
  instance: 'catalog',
  database: 'svc_catalog',
};
const PRIMARY = { host: 'primary.local', port: 5432 };
const REPLICA = { host: 'replica.local', port: 5433 };

function settings(): DatabaseSettings {
  return databaseConfigSchema.parse({
    DB_USER: 'app',
    DB_PASSWORD: 'factory-password',
    DB_CATALOG_NAME: 'svc_catalog',
    DB_INSTANCES: JSON.stringify({
      'db-1': { primary: PRIMARY, replicas: [REPLICA] },
    }),
  });
}

function buildFactory(
  registry = new EntityRegistry(),
): PostgresDataSourceFactory {
  return new PostgresDataSourceFactory(
    settings(),
    { entities: [ProbeEntity], migrations: [] },
    { entities: [CatalogOnlyEntity], migrations: [] },
    registry,
  );
}

describe('PostgresDataSourceFactory', () => {
  describe('when the shard has replicas', () => {
    it('sends writes to the primary and reads to the replicas', () => {
      const dataSource = buildFactory().create(SHARD_TARGET, {
        primary: PRIMARY,
        replicas: [REPLICA],
      });

      expect(dataSource.options).toMatchObject({
        type: 'postgres',
        replication: {
          master: {
            host: 'primary.local',
            port: 5432,
            database: 'svc_shard_0',
          },
          slaves: [{ host: 'replica.local', port: 5433 }],
        },
      });
    });
  });

  describe('when the shard has no replicas', () => {
    it('uses the primary as its only reader', () => {
      const dataSource = buildFactory().create(SHARD_TARGET, {
        primary: PRIMARY,
        replicas: [],
      });

      expect(dataSource.options).toMatchObject({
        replication: { slaves: [{ host: 'primary.local', port: 5432 }] },
      });
    });
  });

  describe('when the catalog is created', () => {
    it('uses the catalog entities plus the ones registered for the catalog', () => {
      const registry = new EntityRegistry();
      registry.register(DatabaseKind.Catalog, [ProbeEntity]);

      const dataSource = buildFactory(registry).create(CATALOG_TARGET, {
        primary: PRIMARY,
        replicas: [],
      });

      expect(dataSource.options.entities).toEqual([
        CatalogOnlyEntity,
        ProbeEntity,
      ]);
    });
  });

  describe('when an entity is both in the definition and registered', () => {
    it('appears once', () => {
      const registry = new EntityRegistry();
      registry.register(DatabaseKind.Shard, [ProbeEntity]);

      const dataSource = buildFactory(registry).create(SHARD_TARGET, {
        primary: PRIMARY,
        replicas: [],
      });

      expect(dataSource.options.entities).toEqual([ProbeEntity]);
    });
  });

  it.each([DatabaseKind.Shard, DatabaseKind.Catalog])(
    'turns synchronize and automatic migrations off for %s',
    (kind) => {
      const dataSource = buildFactory().create(
        { ...SHARD_TARGET, kind, database: 'svc_any' },
        { primary: PRIMARY, replicas: [] },
      );

      expect(dataSource.options).toMatchObject({
        synchronize: false,
        migrationsRun: false,
      });
    },
  );
});
