import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import {
  createEnvelope,
  type MessageEnvelope,
  OutboxStatus,
} from '@platform/messaging';
import {
  applyMigrations,
  Database,
  PgPoolConnection,
  shardMigrations,
} from '@platform/persistence';
import { ClaimState, Deadline } from '@platform/primitives';
import { Pool } from 'pg';
import { PostgresOutboxStore } from '../../src/lib/postgres-outbox-store.js';
import { PostgresProcessedMessageStore } from '../../src/lib/postgres-processed-message-store.js';
import { describeWithDocker } from '../support/docker.js';
import { outboxStoreContract } from '../support/outbox-contract.js';
import { processedMessageStoreContract } from '../support/processed-message-contract.js';

jest.setTimeout(180_000);

const START = new Date('2026-11-12T10:00:00.000Z');
const at = (ms: number): Date => new Date(START.getTime() + ms);
const envelope = (id: string): MessageEnvelope =>
  createEnvelope(
    { type: 't', source: 's', data: { n: 1 } },
    { newId: () => id, now: () => START },
  );
const lease = (owner: string) => ({ owner, token: `${owner}-token` });

describeWithDocker('Postgres messaging adapters (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17').start();
    pool = new Pool({
      connectionString: container.getConnectionUri(),
      max: 10,
    });
    // Un error de un cliente ocioso (p. ej. al parar el contenedor) no debe tumbar Jest.
    pool.on('error', () => undefined);
    database = new Database({
      name: 'shard-1',
      connection: new PgPoolConnection({ primary: pool }),
    });
    await database.readPrimary((session) =>
      applyMigrations(session, shardMigrations),
    );
  });

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE outbox, processed_messages');
  });

  const outbox = (clock = new FixedClock(START)) =>
    new PostgresOutboxStore({ databases: database, clock });
  const append = (
    store: PostgresOutboxStore,
    id: string,
    createdAt: Date,
    groupId?: string,
  ) =>
    database.runInTransaction((uow) =>
      store.append({ envelope: envelope(id), createdAt, groupId }, uow),
    );

  describe('OutboxStore contract', () => {
    outboxStoreContract(async () => {
      await pool.query('TRUNCATE outbox');
      const store = outbox();
      return {
        store,
        add: (env, options) =>
          database.runInTransaction((uow) =>
            store.append(
              {
                envelope: env,
                groupId: options.groupId,
                delayMs: options.delayMs,
                createdAt: options.now,
              },
              uow,
            ),
          ),
        get: (id) => store.get(id),
      };
    });
  });

  describe('ProcessedMessageStore contract', () => {
    processedMessageStoreContract(async () => {
      await pool.query('TRUNCATE processed_messages');
      const clock = new FixedClock(START);
      return {
        store: new PostgresProcessedMessageStore({
          databases: database,
          ids: new SequentialIdGenerator(START),
          clock,
        }),
        clock,
      };
    });
  });

  describe('outbox transactions and concurrency', () => {
    it('commits and rolls back with the business change', async () => {
      const store = outbox();
      await expect(
        database.runInTransaction(async (uow) => {
          await store.append(
            { envelope: envelope('rolled-back'), createdAt: START },
            uow,
          );
          throw new Error('business failure');
        }),
      ).rejects.toThrow('business failure');
      expect(await store.get('rolled-back')).toBeUndefined();

      await append(store, 'committed', START);
      expect((await store.get('committed'))?.status).toBe(OutboxStatus.Pending);
    });

    it('lets concurrent relays claim disjoint batches (SKIP LOCKED)', async () => {
      const store = outbox();
      for (let i = 0; i < 20; i += 1) {
        await append(store, `m${String(i).padStart(2, '0')}`, at(i));
      }
      const claims = await Promise.all(
        ['r1', 'r2', 'r3', 'r4'].map((owner) =>
          store.claimPending({
            now: at(100),
            limit: 8,
            lease: lease(owner),
            leaseMs: 60_000,
          }),
        ),
      );
      const ids = claims.flat().map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(20);
    });

    it('does not skip a group record that another relay holds in an open claim', async () => {
      const store = outbox();
      await append(store, 'g1', at(0), 'order-1');
      await append(store, 'g2', at(1), 'order-1');
      await append(store, 'free', at(2));

      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let claimed!: () => void;
      const firstClaimed = new Promise<void>((resolve) => {
        claimed = resolve;
      });
      // Relay A claims only g1 and keeps its transaction open.
      const relayA = database.runInTransaction(async () => {
        const first = await store.claimPending({
          now: at(10),
          limit: 1,
          lease: lease('a'),
          leaseMs: 60_000,
        });
        expect(first.map((r) => r.id)).toEqual(['g1']);
        claimed();
        await gate;
      });
      await firstClaimed;

      // Relay B must not take g2 ahead of g1; it can take the ungrouped record.
      const second = await store.claimPending({
        now: at(10),
        limit: 10,
        lease: lease('b'),
        leaseMs: 60_000,
      });
      release();
      await relayA;
      expect(second.map((r) => r.id)).toEqual(['free']);
    });

    it('does not let blocked groups use up the claim limit', async () => {
      const store = outbox();
      await append(store, 'a1', at(0), 'order-1');
      await append(store, 'a2', at(1), 'order-1');
      await append(store, 'a3', at(2), 'order-1');
      await append(store, 'free', at(3));
      const setup = lease('setup');
      await store.claimPending({
        now: at(10),
        limit: 1,
        lease: setup,
        leaseMs: 60_000,
      });
      const claimed = await store.claimPending({
        now: at(20),
        limit: 2,
        lease: lease('next'),
        leaseMs: 60_000,
      });
      expect(claimed.map((r) => r.id)).toEqual(['free']);
    });

    it('purges published records past retention', async () => {
      const store = outbox(new FixedClock(START));
      await append(store, 'pub', START);
      await append(store, 'open', START);
      const relay = lease('relay');
      await store.claimPending({
        now: START,
        limit: 1,
        lease: relay,
        leaseMs: 1_000,
      });
      await store.markPublished('pub', relay);
      expect(await store.purge({ before: at(1) })).toBe(1);
      expect(await store.get('pub')).toBeUndefined();
      expect(await store.get('open')).toBeDefined();
    });
  });

  describe('processed messages in the handler transaction', () => {
    it('undoes complete when the handler transaction rolls back', async () => {
      const clock = new FixedClock(START);
      const store = new PostgresProcessedMessageStore({
        databases: database,
        ids: new SequentialIdGenerator(START),
        clock,
      });
      const request = () => ({
        fingerprint: 'fp',
        deadline: Deadline.after(1_000, clock),
      });
      const claim = await store.claim('k', request());
      if (claim.state !== ClaimState.Acquired) throw new Error('unreachable');

      await expect(
        database.runInTransaction(async () => {
          await store.complete('k', claim.claimToken, { processedAt: 1 });
          throw new Error('handler failed');
        }),
      ).rejects.toThrow('handler failed');
      expect((await store.claim('k', request())).state).toBe(
        ClaimState.InProgress,
      );

      await database.runInTransaction(() =>
        store.complete('k', claim.claimToken, { processedAt: 2 }),
      );
      expect(await store.claim('k', request())).toMatchObject({
        state: ClaimState.Completed,
        result: { processedAt: 2 },
      });
    });
  });
});
