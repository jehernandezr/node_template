import { ContainerRuntime } from '@platform/kernel/test-utils';
import { OutboxStatus } from '@platform/messaging';
import {
  ManagerIntent,
  type ShardConnection,
  PersistenceErrorCode,
} from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { ShardingErrorCode } from '@platform/sharding';
import type { EntityManager } from 'typeorm';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);
const T0 = new Date('2026-01-01T00:00:00.000Z');

function outboxRow(id: string) {
  return {
    id,
    envelope: { id } as never,
    status: OutboxStatus.Pending,
    attempts: 0,
    nextAttemptAt: T0,
    createdAt: T0,
    updatedAt: T0,
    groupId: null,
    delayMs: null,
    lastError: null,
    leaseOwner: null,
    leaseToken: null,
    leaseExpiresAt: null,
  };
}

function deleteAll(manager: EntityManager): Promise<number> {
  return manager
    .createQueryBuilder()
    .delete()
    .from(OutboxEntity)
    .where('id IS NOT NULL')
    .execute()
    .then((result) => result.affected ?? 0);
}

runtime.describeIfAvailable('PlatformEntityManagers over PostgreSQL', () => {
  const database = new PlatformTestDatabase();
  const tenantA = PlatformTestDatabase.TENANT_A;

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
  });

  async function connectionOf(shard: string): Promise<ShardConnection> {
    const location = {
      logicalShard: shard,
      instance: ShardedTestDatabase.INSTANCE,
    };
    return { location, dataSource: await database.db.sources.get(location) };
  }

  async function rowsIn(shard: string): Promise<number> {
    const connection = await connectionOf(shard);
    const [row] = await connection.dataSource.query<{ count: string }[]>(
      'SELECT count(*) AS count FROM outbox',
    );
    return Number(row.count);
  }

  function insertRow(id: string) {
    return database.managers.run(ManagerIntent.Write, (manager) =>
      manager.insert(OutboxEntity, outboxRow(id)),
    );
  }

  it('writes to the shard of the tenant in the context', async () => {
    await database.db.runAs(tenantA, () => insertRow('in-tenant'));

    await expect(rowsIn(PlatformTestDatabase.SHARD_A)).resolves.toBe(1);
    await expect(rowsIn(PlatformTestDatabase.SHARD_B)).resolves.toBe(0);
  });

  it('writes to the bound shard even when the context belongs to another tenant', async () => {
    const connectionB = await connectionOf(PlatformTestDatabase.SHARD_B);

    await database.db.runAs(tenantA, () =>
      database.binding.run(connectionB, () => insertRow('bound-b')),
    );

    await expect(rowsIn(PlatformTestDatabase.SHARD_A)).resolves.toBe(0);
    await expect(rowsIn(PlatformTestDatabase.SHARD_B)).resolves.toBe(1);
  });

  it('reads from the bound shard with Read and ReadPrimary', async () => {
    const connectionA = await connectionOf(PlatformTestDatabase.SHARD_A);
    const connectionB = await connectionOf(PlatformTestDatabase.SHARD_B);
    await database.binding.run(connectionA, () => insertRow('read-a'));

    for (const intent of [ManagerIntent.Read, ManagerIntent.ReadPrimary]) {
      await expect(
        database.binding.run(connectionA, () =>
          database.managers.run(intent, (manager) =>
            manager.count(OutboxEntity),
          ),
        ),
      ).resolves.toBe(1);
      await expect(
        database.binding.run(connectionB, () =>
          database.managers.run(intent, (manager) =>
            manager.count(OutboxEntity),
          ),
        ),
      ).resolves.toBe(0);
    }
  });

  it('rolls back the write of a transaction that throws after it', async () => {
    await expect(
      database.db.runAs(tenantA, () =>
        database.db.transactions.runInTransaction(async () => {
          await insertRow('rolled-back');
          throw new Error('rollback');
        }),
      ),
    ).rejects.toThrow('rollback');

    await expect(rowsIn(PlatformTestDatabase.SHARD_A)).resolves.toBe(0);
  });

  describe('sweep', () => {
    it('without a fixed shard or tenant, adds up what each shard returns', async () => {
      const connectionA = await connectionOf(PlatformTestDatabase.SHARD_A);
      const connectionB = await connectionOf(PlatformTestDatabase.SHARD_B);
      await database.binding.run(connectionA, () => insertRow('sweep-a'));
      await database.binding.run(connectionB, () => insertRow('sweep-b'));

      await expect(
        database.managers.sweep((manager) => deleteAll(manager)),
      ).resolves.toBe(2);
    });

    it('with a fixed shard, deletes only in that shard', async () => {
      const connectionA = await connectionOf(PlatformTestDatabase.SHARD_A);
      const connectionB = await connectionOf(PlatformTestDatabase.SHARD_B);
      await database.binding.run(connectionA, () => insertRow('only-a'));
      await database.binding.run(connectionB, () => insertRow('only-b'));

      await expect(
        database.binding.run(connectionA, () =>
          database.managers.sweep((manager) => deleteAll(manager)),
        ),
      ).resolves.toBe(1);
      await expect(rowsIn(PlatformTestDatabase.SHARD_A)).resolves.toBe(0);
      await expect(rowsIn(PlatformTestDatabase.SHARD_B)).resolves.toBe(1);
    });

    it('rejects with the shards that failed', async () => {
      const connectionB = await connectionOf(PlatformTestDatabase.SHARD_B);

      await expect(
        database.managers.sweep(async (manager) => {
          if (manager.connection === connectionB.dataSource) {
            throw new Error('shard down');
          }
          return 0;
        }),
      ).rejects.toMatchObject({
        code: PersistenceErrorCode.QueryFailed,
        details: { shards: [PlatformTestDatabase.SHARD_B] },
      });
    });
  });

  it('rejects a write with no tenant, no fixed shard and no ShardScope', async () => {
    await expect(insertRow('no-key')).rejects.toMatchObject({
      code: ShardingErrorCode.KeyMissing,
    });
  });
});
