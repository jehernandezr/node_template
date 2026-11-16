import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import { OutboxStatus } from '@platform/messaging';
import {
  EnvelopeBuilder,
  runOutboxStoreContract,
} from '@platform/messaging/test-utils';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { OutboxClaimQuery } from '../stores/outbox-claim-query.js';
import { TypeOrmOutboxStore } from '../stores/typeorm-outbox-store.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);
const T0 = new Date('2026-01-01T00:00:00.000Z');
const LEASE_MS = 60_000;

runtime.describeIfAvailable('TypeOrmOutboxStore over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
  });

  function message(id: string) {
    return EnvelopeBuilder.anEnvelope({ id, type: 't', source: 's' });
  }

  async function storeOn(shard: string): Promise<TypeOrmOutboxStore> {
    const clock = new FixedClock(T0);
    return new TypeOrmOutboxStore(
      await database.pinned(shard),
      clock,
      new OutboxClaimQuery(clock),
    );
  }

  async function countIn(shard: string, sql: string): Promise<number> {
    const dataSource = await database.db.sources.get({
      logicalShard: shard,
      instance: ShardedTestDatabase.INSTANCE,
    });
    const [row] = await dataSource.query<{ count: string }[]>(sql);
    return Number(row.count);
  }

  describe('contract', () => {
    runOutboxStoreContract(async () => {
      await database.truncateAll();
      const store = await storeOn(PlatformTestDatabase.SHARD_A);
      return {
        store,
        add: (envelope, { now, groupId, delayMs }) =>
          store.append({
            envelope,
            createdAt: now,
            ...(groupId === undefined ? {} : { groupId }),
            ...(delayMs === undefined ? {} : { delayMs }),
          }),
        get: (id) => store.get(id),
      };
    });
  });

  describe('when used through the tenant context', () => {
    it('rolls back the append together with the business transaction', async () => {
      const store = new TypeOrmOutboxStore(
        database.managers,
        new FixedClock(T0),
        new OutboxClaimQuery(new FixedClock(T0)),
      );

      await expect(
        database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
          database.db.transactions.runInTransaction(async () => {
            await store.append({ envelope: message('rolled'), createdAt: T0 });
            throw new Error('rollback');
          }),
        ),
      ).rejects.toThrow('rollback');

      await expect(
        database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
          store.get('rolled'),
        ),
      ).resolves.toBeUndefined();
    });

    it('commits the append in the shard of the tenant and not in the other one', async () => {
      const store = new TypeOrmOutboxStore(
        database.managers,
        new FixedClock(T0),
        new OutboxClaimQuery(new FixedClock(T0)),
      );

      await database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
        database.db.transactions.runInTransaction(() =>
          store.append({ envelope: message('kept'), createdAt: T0 }),
        ),
      );

      await expect(
        database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
          store.get('kept'),
        ),
      ).resolves.toMatchObject({ id: 'kept' });
      await expect(
        database.db.runAs(PlatformTestDatabase.TENANT_B, () =>
          store.get('kept'),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('when two relays claim at the same time', () => {
    it('never hands the same message to both of them', async () => {
      const store = await storeOn(PlatformTestDatabase.SHARD_A);
      for (let i = 0; i < 20; i++) {
        await store.append({
          envelope: message(`m-${String(i).padStart(2, '0')}`),
          createdAt: T0,
        });
      }

      const [first, second] = await Promise.all([
        store.claimPending({
          now: T0,
          limit: 20,
          lease: { owner: 'relay-a', token: 'token-a' },
          leaseMs: LEASE_MS,
        }),
        store.claimPending({
          now: T0,
          limit: 20,
          lease: { owner: 'relay-b', token: 'token-b' },
          leaseMs: LEASE_MS,
        }),
      ]);

      const claimed = [...first, ...second].map((record) => record.id);
      expect(claimed).toHaveLength(20);
      expect(new Set(claimed).size).toBe(20);
    });
  });

  describe('purge without a fixed shard', () => {
    it('removes published rows in every shard and keeps pending and dead ones', async () => {
      for (const shard of [
        PlatformTestDatabase.SHARD_A,
        PlatformTestDatabase.SHARD_B,
      ]) {
        const store = await storeOn(shard);
        await store.append({
          envelope: message(`pub-${shard}`),
          createdAt: T0,
        });
        const [record] = await store.claimPending({
          now: T0,
          limit: 1,
          lease: { owner: 'relay', token: 'token' },
          leaseMs: LEASE_MS,
        });
        await store.markPublished(record.id, {
          owner: 'relay',
          token: 'token',
        });
      }
      const shardA = await storeOn(PlatformTestDatabase.SHARD_A);
      await shardA.append({ envelope: message('dead'), createdAt: T0 });
      await shardA.append({
        envelope: message('pending'),
        createdAt: new Date(T0.getTime() + 1),
      });
      const [dead] = await shardA.claimPending({
        now: T0,
        limit: 1,
        lease: { owner: 'relay', token: 'dead-token' },
        leaseMs: LEASE_MS,
      });
      await shardA.markDead(
        dead.id,
        { owner: 'relay', token: 'dead-token' },
        'boom',
      );

      const sharedStore = new TypeOrmOutboxStore(
        database.managers,
        new FixedClock(T0),
        new OutboxClaimQuery(new FixedClock(T0)),
      );
      const before = new Date(T0.getTime() + 1);
      await expect(sharedStore.purge({ before })).resolves.toBe(2);
      await expect(shardA.get('pending')).resolves.toMatchObject({
        status: OutboxStatus.Pending,
      });
      await expect(shardA.get(dead.id)).resolves.toMatchObject({
        status: OutboxStatus.Dead,
      });

      await expect(
        sharedStore.purge({ before, includeDead: true }),
      ).resolves.toBe(1);
    });
  });

  describe('when the lease is not ours', () => {
    it('markFailed returns false and leaves the row unchanged', async () => {
      const store = await storeOn(PlatformTestDatabase.SHARD_A);
      await store.append({ envelope: message('owned'), createdAt: T0 });
      await store.claimPending({
        now: T0,
        limit: 1,
        lease: { owner: 'relay-a', token: 'token-a' },
        leaseMs: LEASE_MS,
      });

      await expect(
        store.markFailed(
          'owned',
          { owner: 'relay-b', token: 'token-b' },
          'nope',
          T0,
        ),
      ).resolves.toBe(false);
      await expect(store.get('owned')).resolves.toMatchObject({
        status: OutboxStatus.Pending,
        attempts: 0,
        leaseOwner: 'relay-a',
        leaseToken: 'token-a',
      });
    });
  });

  it('counts the rows the store wrote, per shard, through the raw connection', async () => {
    const store = await storeOn(PlatformTestDatabase.SHARD_A);
    await store.append({ envelope: message('raw'), createdAt: T0 });

    await expect(
      countIn(
        PlatformTestDatabase.SHARD_A,
        'SELECT count(*) AS count FROM outbox',
      ),
    ).resolves.toBe(1);
    await expect(
      countIn(
        PlatformTestDatabase.SHARD_B,
        'SELECT count(*) AS count FROM outbox',
      ),
    ).resolves.toBe(0);
  });
});
