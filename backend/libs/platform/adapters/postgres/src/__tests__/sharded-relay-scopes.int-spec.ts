import { PlatformErrorCode } from '@contracts/platform';
import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import { OutboxStatus } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { ShardedRelayScopes } from '../relay/sharded-relay-scopes.js';
import { OutboxClaimQuery } from '../stores/outbox-claim-query.js';
import { TypeOrmOutboxStore } from '../stores/typeorm-outbox-store.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);
const T0 = new Date('2026-01-01T00:00:00.000Z');
const LEASE = { owner: 'relay', token: 'token' };

interface Visit {
  readonly shard: string | undefined;
  readonly ids: readonly string[];
}

runtime.describeIfAvailable('ShardedRelayScopes over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
    await seed(PlatformTestDatabase.SHARD_A, 'in-a');
    await seed(PlatformTestDatabase.SHARD_B, 'in-b');
  });

  async function seed(shard: string, id: string): Promise<void> {
    const clock = new FixedClock(T0);
    const store = new TypeOrmOutboxStore(
      await database.pinned(shard),
      clock,
      new OutboxClaimQuery(clock),
    );
    await store.append({
      envelope: EnvelopeBuilder.anEnvelope({ id }),
      createdAt: T0,
    });
  }

  /** Cuerpo de la pasada: reclama con el relay y anota en qué shard corrió y qué reclamó. */
  function visitOf(visits: Visit[]): () => Promise<void> {
    return async () => {
      const clock = new FixedClock(T0);
      const store = new TypeOrmOutboxStore(
        database.managers,
        clock,
        new OutboxClaimQuery(clock),
      );
      const claimed = await store.claimPending({
        now: T0,
        limit: 10,
        lease: LEASE,
        leaseMs: 60_000,
      });
      visits.push({
        shard: database.binding.current()?.location.logicalShard,
        ids: claimed.map((record) => record.id),
      });
    };
  }

  it('runs the pass once per shard with that shard bound', async () => {
    const visits: Visit[] = [];
    const scopes = new ShardedRelayScopes(
      database.db.acrossShards,
      database.binding,
    );

    await scopes.forEach(visitOf(visits));

    expect(visits).toHaveLength(2);
    expect(visits).toContainEqual({
      shard: PlatformTestDatabase.SHARD_A,
      ids: ['in-a'],
    });
    expect(visits).toContainEqual({
      shard: PlatformTestDatabase.SHARD_B,
      ids: ['in-b'],
    });
  });

  it('rejects with the failing shards and still runs the other one', async () => {
    const visits: Visit[] = [];
    const visit = visitOf(visits);
    const scopes = new ShardedRelayScopes(
      database.db.acrossShards,
      database.binding,
    );

    await expect(
      scopes.forEach(async () => {
        if (
          database.binding.current()?.location.logicalShard ===
          PlatformTestDatabase.SHARD_B
        ) {
          throw new Error('shard down');
        }
        await visit();
      }),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.PersistenceQueryFailed,
      details: { shards: [PlatformTestDatabase.SHARD_B] },
    });
    expect(visits).toContainEqual({
      shard: PlatformTestDatabase.SHARD_A,
      ids: ['in-a'],
    });
  });

  it('accepts a concurrency and a shard timeout and still visits both shards', async () => {
    const visits: Visit[] = [];
    const scopes = new ShardedRelayScopes(
      database.db.acrossShards,
      database.binding,
      { concurrency: 1, shardTimeoutMs: 10_000 },
    );

    await scopes.forEach(visitOf(visits));

    expect(visits.map((visit) => visit.shard).sort()).toEqual([
      PlatformTestDatabase.SHARD_A,
      PlatformTestDatabase.SHARD_B,
    ]);
  });

  it('keeps the rows of the failing shard untouched', async () => {
    const scopes = new ShardedRelayScopes(
      database.db.acrossShards,
      database.binding,
    );
    await expect(
      scopes.forEach(async () => {
        throw new Error('shard down');
      }),
    ).rejects.toMatchObject({ code: PlatformErrorCode.PersistenceQueryFailed });

    const clock = new FixedClock(T0);
    const store = new TypeOrmOutboxStore(
      await database.pinned(PlatformTestDatabase.SHARD_A),
      clock,
      new OutboxClaimQuery(clock),
    );
    await expect(store.get('in-a')).resolves.toMatchObject({
      status: OutboxStatus.Pending,
    });
  });
});
