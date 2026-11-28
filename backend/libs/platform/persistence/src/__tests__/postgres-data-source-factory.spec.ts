import { DatabaseKind } from '../model/database-kind.enum.js';
import { EntityRegistry } from '../entity-registry.js';
import { PostgresDataSourceFactory } from '../postgres-data-source-factory.js';
import {
  databaseConfigSchema,
  type DatabaseSettings,
} from '../config/database.config.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { RecordingDatabaseTokenProvider } from './utils/recording-database-token-provider.js';

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

function settings(extra: Record<string, string> = {}): DatabaseSettings {
  return databaseConfigSchema.parse({
    DB_USER: 'app',
    DB_PASSWORD: 'factory-password',
    DB_CATALOG_NAME: 'svc_catalog',
    ...extra,
    DB_INSTANCES: JSON.stringify({
      'db-1': { primary: PRIMARY, replicas: [REPLICA] },
    }),
  });
}

function buildFactory(
  registry = new EntityRegistry(),
  tokens = new RecordingDatabaseTokenProvider(),
  values = settings(),
): PostgresDataSourceFactory {
  return new PostgresDataSourceFactory(
    values,
    { entities: [ProbeEntity], migrations: [] },
    { entities: [CatalogOnlyEntity], migrations: [] },
    registry,
    tokens,
  );
}

type Credentials = { username: string; password: () => Promise<string> };

function replication(options: unknown): {
  master: Credentials;
  slaves: Credentials[];
} {
  return (
    options as {
      replication: { master: Credentials; slaves: Credentials[] };
    }
  ).replication;
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

  describe('when a connection opens', () => {
    it('asks the token provider for the host, port and user of that node every time', async () => {
      const tokens = new RecordingDatabaseTokenProvider();
      const dataSource = buildFactory(
        new EntityRegistry(),
        tokens,
        settings({ DB_AUTH: 'iam', DB_READER_USER: 'svc_reader' }),
      ).create(SHARD_TARGET, { primary: PRIMARY, replicas: [REPLICA] });
      const { master, slaves } = replication(dataSource.options);

      await expect(master.password()).resolves.toBe('token-1');
      await expect(master.password()).resolves.toBe('token-2');
      await expect(slaves[0]?.password()).resolves.toBe('token-3');

      expect(tokens.requests).toEqual([
        { host: 'primary.local', port: 5432, user: 'app' },
        { host: 'primary.local', port: 5432, user: 'app' },
        { host: 'replica.local', port: 5433, user: 'svc_reader' },
      ]);
      expect(slaves[0]?.username).toBe('svc_reader');
    });

    it('connects to the primary as DB_USER when there are no replicas, even with a reader user', () => {
      const dataSource = buildFactory(
        new EntityRegistry(),
        new RecordingDatabaseTokenProvider(),
        settings({ DB_READER_USER: 'svc_reader' }),
      ).create(SHARD_TARGET, { primary: PRIMARY, replicas: [] });

      expect(replication(dataSource.options).slaves[0]?.username).toBe('app');
    });
  });

  describe('when a node does not answer', () => {
    it('gives up connecting to it after DB_CONNECT_TIMEOUT_MS', () => {
      const dataSource = buildFactory(
        new EntityRegistry(),
        new RecordingDatabaseTokenProvider(),
        settings({ DB_CONNECT_TIMEOUT_MS: '1500' }),
      ).create(SHARD_TARGET, { primary: PRIMARY, replicas: [REPLICA] });

      const { Client } = dataSource.options.extra as {
        Client: new (config: object) => { _connectionTimeoutMillis?: number };
      };
      const client = new Client({ host: 'primary.local' });

      expect(client._connectionTimeoutMillis).toBe(1500);
    });

    it('does not bound the wait for a free client of the pool', () => {
      const dataSource = buildFactory(
        new EntityRegistry(),
        new RecordingDatabaseTokenProvider(),
        settings({ DB_CONNECT_TIMEOUT_MS: '1500' }),
      ).create(SHARD_TARGET, { primary: PRIMARY, replicas: [REPLICA] });

      expect(dataSource.options).not.toHaveProperty('connectTimeoutMS');
      expect(dataSource.options.extra).not.toHaveProperty(
        'connectionTimeoutMillis',
      );
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
