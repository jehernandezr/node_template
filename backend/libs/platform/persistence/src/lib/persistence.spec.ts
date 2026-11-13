import { SequentialIdGenerator } from '@platform/kernel/testing';
import { ShardKey } from '@platform/sharding';
import { RecordingConnection } from '../../test/support/recording-connection.js';
import { Database } from './database.js';
import { DataAccess, PersistenceErrorCode } from './enums.js';
import { createPersistence } from './persistence.js';
import { ShardedDatabaseResolver } from './sharding/database-resolver.js';

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
    expect(
      persistence.idempotencyStore(new SequentialIdGenerator()),
    ).toBeDefined();
    await persistence.close();
  });

  it('builds a sharded service on the catalog directory', async () => {
    const persistence = createPersistence({
      catalog: new RecordingConnection(),
      sharding: {
        key: ShardKey.Tenant,
        connect: () => new RecordingConnection(),
      },
    });
    expect(persistence.transactions).toBeInstanceOf(ShardedDatabaseResolver);
    expect(persistence.catalog?.global).toBe(true);
    expect(persistence.router).toBeDefined();
    expect(persistence.directory).toBeDefined();
    await persistence.close();
  });

  it('requires exactly one mode and a catalog for sharding', () => {
    expect(() => createPersistence({})).toThrow(
      expect.objectContaining({
        code: PersistenceErrorCode.InvalidConfiguration,
      }),
    );
    expect(() =>
      createPersistence({
        database: new RecordingConnection(),
        sharding: {
          key: ShardKey.Tenant,
          connect: () => new RecordingConnection(),
        },
      }),
    ).toThrow('persistence must be either database or sharding');
    expect(() =>
      createPersistence({
        sharding: {
          key: ShardKey.Tenant,
          connect: () => new RecordingConnection(),
        },
      }),
    ).toThrow('catalog must be set when sharding is enabled');
  });
});
