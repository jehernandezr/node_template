import {
  InMemoryDirectoryStore,
  ShardingErrorCode,
  ShardKey,
  ShardRouter,
  TenantStatus,
} from '@platform/sharding';
import { RecordingConnection } from '../../../test/support/recording-connection.js';
import type { PersistenceContext } from '../context/persistence-context.js';
import { DataAccess } from '../enums.js';
import {
  ShardedDatabaseResolver,
  type ShardTarget,
} from './database-resolver.js';

const TENANT_A = '0193f1c2-0000-7000-8000-00000000000a';
const TENANT_B = '0193f1c2-0000-7000-8000-00000000000b';
const TENANT_MOVING = '0193f1c2-0000-7000-8000-00000000000c';

function setup(key: ShardKey = ShardKey.Tenant) {
  const directory = new InMemoryDirectoryStore();
  directory.setPlacement({
    tenantId: TENANT_A,
    region: 'co',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
  });
  directory.setPlacement({
    tenantId: TENANT_B,
    region: 'co',
    shardGroup: ['shard-2'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
  });
  directory.setPlacement({
    tenantId: TENANT_MOVING,
    region: 'co',
    shardGroup: ['shard-1'],
    status: TenantStatus.Migrating,
    version: 4,
    dedicated: false,
  });
  directory.setInstance('shard-1', 'db-a');
  directory.setInstance('shard-2', 'db-b');
  const router = new ShardRouter({ directory, localTtlMs: 1 });
  const connections = new Map<string, RecordingConnection>();
  const opened: ShardTarget[] = [];
  let context: PersistenceContext = { tenantId: TENANT_A, actorId: 'user-1' };
  const resolver = new ShardedDatabaseResolver({
    router,
    key,
    connect: (target) => {
      opened.push(target);
      const connection = new RecordingConnection();
      connections.set(`${target.logicalShard}@${target.instance}`, connection);
      return connection;
    },
    listShards: async () => ['shard-1', 'shard-2', 'shard-orphan'],
    directory,
    database: { context: () => context },
  });
  return {
    directory,
    router,
    resolver,
    connections,
    opened,
    setContext: (next: PersistenceContext) => {
      context = next;
    },
  };
}

describe('ShardedDatabaseResolver', () => {
  it('routes each tenant to its logical shard and reuses the database', async () => {
    const { resolver, setContext, opened } = setup();
    const a = await resolver.resolve(DataAccess.Read);
    expect(a.name).toBe('shard-1');
    expect(await resolver.resolve(DataAccess.Write)).toBe(a);
    setContext({ tenantId: TENANT_B });
    expect((await resolver.resolve(DataAccess.Read)).name).toBe('shard-2');
    expect(opened).toEqual([
      { logicalShard: 'shard-1', instance: 'db-a' },
      { logicalShard: 'shard-2', instance: 'db-b' },
    ]);
  });

  it('never picks a default shard: no tenant is KEY_MISSING', async () => {
    const { resolver, setContext } = setup();
    setContext({});
    await expect(resolver.resolve(DataAccess.Read)).rejects.toMatchObject({
      code: ShardingErrorCode.KeyMissing,
    });
  });

  it('blocks writes of a migrating tenant and lets reads through', async () => {
    const { resolver, setContext } = setup();
    setContext({ tenantId: TENANT_MOVING });
    await expect(resolver.resolve(DataAccess.Write)).rejects.toMatchObject({
      code: ShardingErrorCode.TenantMigrating,
    });
    await expect(resolver.resolve(DataAccess.Read)).resolves.toMatchObject({
      name: 'shard-1',
    });
  });

  it('uses the actor as key with ShardKey.User', async () => {
    const { resolver, setContext } = setup(ShardKey.User);
    setContext({ tenantId: TENANT_A });
    await expect(resolver.resolve(DataAccess.Read)).rejects.toMatchObject({
      code: ShardingErrorCode.KeyMissing,
    });
    setContext({ tenantId: TENANT_A, actorId: 'user-1' });
    await expect(resolver.resolve(DataAccess.Read)).resolves.toMatchObject({
      name: 'shard-1',
    });
  });

  it('runs transactions in the shard of the context and refuses a second shard', async () => {
    const { resolver, setContext, connections } = setup();
    const error = await resolver
      .runInTransaction(async () => {
        setContext({ tenantId: TENANT_B });
        await resolver.runInTransaction(async () => undefined);
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({
      code: ShardingErrorCode.CrossShardTransaction,
    });
    expect(connections.get('shard-1@db-a')?.sql().at(-1)).toBe('ROLLBACK');
    expect(connections.has('shard-2@db-b')).toBe(true);
    expect(connections.get('shard-2@db-b')?.statements).toEqual([]);
  });

  it('opens a new database when a shard moves to another instance', async () => {
    const { resolver, directory, router, opened } = setup();
    const before = await resolver.resolve(DataAccess.Read);
    directory.setInstance('shard-1', 'db-z');
    router.invalidateShard('shard-1');
    const after = await resolver.resolve(DataAccess.Read);
    expect(after).not.toBe(before);
    expect(opened.at(-1)).toEqual({
      logicalShard: 'shard-1',
      instance: 'db-z',
    });
    await resolver.close();
  });

  it('lists every registered shard for cross-shard queries', async () => {
    const { resolver } = setup();
    const all = await resolver.all();
    expect(all.map((database) => database.name)).toEqual([
      'shard-1',
      'shard-2',
    ]);
  });

  it('runs afterCommit inside the open transaction or right away', async () => {
    const { resolver } = setup();
    const order: string[] = [];
    await resolver.runInTransaction(async () => {
      resolver.afterCommit(() => {
        order.push('after commit');
      });
      expect(resolver.isInTransaction()).toBe(true);
      order.push('inside');
    });
    resolver.afterCommit(() => {
      order.push('immediate');
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['inside', 'after commit', 'immediate']);
  });
});
