import { PlatformErrorCode } from '@contracts/platform';
import { ShardKey } from '@platform/sharding';
import { RecordingConnection } from '../testing/recording-connection.js';
import { Database } from '../database.js';
import { DataAccess } from '../enums.js';
import { createPersistence, type ShardDirectory } from '../persistence.js';
import { ShardedDatabaseResolver } from '../sharding/database-resolver.js';

const emptyDirectory: ShardDirectory = {
  getPlacement: async () => undefined,
  getInstance: async () => undefined,
  listShards: async () => [],
};

describe('createPersistence', () => {
  it('builds a single database service', async () => {
    const persistence = createPersistence({
      database: new RecordingConnection(),
    });
    expect(persistence.transactions).toBeInstanceOf(Database);
    expect((await persistence.databases.resolve(DataAccess.Read)).name).toBe(
      'primary',
    );
    expect(persistence.router).toBeUndefined();
    await persistence.close();
  });

  it('builds a sharded service on the catalog directory', async () => {
    const persistence = createPersistence({
      catalog: new RecordingConnection(),
      sharding: {
        key: ShardKey.Tenant,
        connect: () => new RecordingConnection(),
        directory: (catalog) => {
          expect(catalog.global).toBe(true);
          return emptyDirectory;
        },
      },
    });
    expect(persistence.transactions).toBeInstanceOf(ShardedDatabaseResolver);
    expect(persistence.catalog?.global).toBe(true);
    expect(persistence.router).toBeDefined();
    expect(persistence.directory).toBe(emptyDirectory);
    await persistence.close();
  });

  it('requires exactly one mode and a catalog for sharding', () => {
    expect(() => createPersistence({} as never)).toThrow(
      expect.objectContaining({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      }),
    );
    expect(() =>
      createPersistence({
        database: new RecordingConnection(),
        sharding: {
          key: ShardKey.Tenant,
          connect: () => new RecordingConnection(),
          directory: () => emptyDirectory,
        },
      } as never),
    ).toThrow('persistence must be either database or sharding');
    expect(() =>
      createPersistence({
        sharding: {
          key: ShardKey.Tenant,
          connect: () => new RecordingConnection(),
          directory: () => emptyDirectory,
        },
      } as never),
    ).toThrow('catalog must be set when sharding is enabled');
  });
});
