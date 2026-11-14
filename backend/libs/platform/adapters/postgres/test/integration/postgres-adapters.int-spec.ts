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
} from '@platform/persistence';
import { SystemClock } from '@platform/kernel';
import { ClaimState, Deadline } from '@platform/primitives';
import {
  DirectoryWriteResult,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import { Pool } from 'pg';
import { catalogMigrations } from '../../src/lib/catalog-migrations.js';
import { PostgresDirectoryStore } from '../../src/lib/postgres-directory-store.js';
import { PostgresIdempotencyStore } from '../../src/lib/postgres-idempotency-store.js';
import { PostgresOutboxStore } from '../../src/lib/postgres-outbox-store.js';
import { shardMigrations } from '../../src/lib/shard-migrations.js';
import { PostgresProcessedMessageStore } from '../../src/lib/postgres-processed-message-store.js';
import { describeWithDocker } from '../support/docker.js';
import { idempotencyStoreContract } from '../support/idempotency-contract.js';
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
  let catalogPool: Pool;
  let database: Database;
  let catalog: Database;

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
    await pool.query('CREATE DATABASE catalog');
    const catalogUrl = new URL(container.getConnectionUri());
    catalogUrl.pathname = '/catalog';
    catalogPool = new Pool({
      connectionString: catalogUrl.toString(),
      max: 10,
    });
    catalogPool.on('error', () => undefined);
    catalog = new Database({
      name: 'catalog',
      global: true,
      connection: new PgPoolConnection({ primary: catalogPool }),
    });
    await catalog.readPrimary((session) =>
      applyMigrations(session, catalogMigrations),
    );
  });

  afterAll(async () => {
    await catalogPool.end();
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE outbox, processed_messages, idempotency_keys');
  });

  const outbox = (clock = new FixedClock(START)) =>
    new PostgresOutboxStore({ databases: database, clock });
  const append = (
    store: PostgresOutboxStore,
    id: string,
    createdAt: Date,
    groupId?: string,
  ) =>
    database.runInTransaction(() =>
      store.append({ envelope: envelope(id), createdAt, groupId }),
    );

  describe('OutboxStore contract', () => {
    outboxStoreContract(async () => {
      await pool.query('TRUNCATE outbox');
      const store = outbox();
      return {
        store,
        add: (env, options) =>
          database.runInTransaction(() =>
            store.append({
              envelope: env,
              groupId: options.groupId,
              delayMs: options.delayMs,
              createdAt: options.now,
            }),
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
        database.runInTransaction(async () => {
          await store.append({
            envelope: envelope('rolled-back'),
            createdAt: START,
          });
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
  describe('PostgresIdempotencyStore', () => {
    describe('contract', () => {
      idempotencyStoreContract(async () => {
        await pool.query('TRUNCATE idempotency_keys');
        const clock = new FixedClock(START);
        return {
          clock,
          start: START,
          store: new PostgresIdempotencyStore<{ orderId: string }>({
            databases: database,
            ids: new SequentialIdGenerator(START),
            clock,
          }),
        };
      });
    });

    it('gives exactly one acquirer among concurrent claims', async () => {
      const clock = new SystemClock();
      const ids = new SequentialIdGenerator();
      const stores = Array.from(
        { length: 8 },
        () =>
          new PostgresIdempotencyStore({
            databases: new Database({
              name: 'shard-1',
              connection: new PgPoolConnection({ primary: pool }),
            }),
            ids,
            clock,
          }),
      );
      const results = await Promise.all(
        stores.map((store) =>
          store.claim('race', {
            fingerprint: 'fp',
            deadline: Deadline.after(5_000, clock),
          }),
        ),
      );
      expect(
        results.filter((r) => r.state === ClaimState.Acquired),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r.state === ClaimState.InProgress),
      ).toHaveLength(7);
    });

    it('rolls back complete with the business transaction', async () => {
      const clock = new FixedClock(START);
      const store = new PostgresIdempotencyStore<{ orderId: string }>({
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
          await store.complete('k', claim.claimToken, { orderId: 'o-1' });
          throw new Error('business failure');
        }),
      ).rejects.toThrow('business failure');
      expect((await store.claim('k', request())).state).toBe(
        ClaimState.InProgress,
      );
    });
  });

  describe('PostgresDirectoryStore', () => {
    const placement = (
      tenantId: string,
      shard: string,
      version: number,
    ): TenantPlacement => ({
      tenantId,
      region: 'co',
      shardGroup: [shard],
      status: TenantStatus.Active,
      version,
      dedicated: false,
    });
    const directory = () => new PostgresDirectoryStore({ catalog });

    it('keeps the highest version when placements race', async () => {
      const store = directory();
      const tenant = '0193f1c2-0000-7000-8000-0000000000f1';
      const versions = [7, 3, 12, 1, 9, 12, 5, 2, 11, 4, 8, 6, 10];
      const written = await Promise.all(
        versions.map((version) =>
          store.setPlacementIfNewer(
            placement(tenant, `shard-v${version}`, version),
          ),
        ),
      );
      const stored = await store.getPlacement(tenant);
      expect(stored?.version).toBe(12);
      expect(stored?.shardGroup).toEqual(['shard-v12']);
      expect(written.filter(Boolean).length).toBeGreaterThanOrEqual(1);
      expect(
        await store.setPlacementIfNewer(placement(tenant, 'shard-x', 12)),
      ).toBe(false);
    });

    it('lets only one dedicated tenant take an empty shard when placements race', async () => {
      const store = directory();
      const tenants = Array.from(
        { length: 8 },
        (_, index) => `0193f1c2-0000-7000-8000-0000000001${index}0`,
      );
      const results = await Promise.all(
        tenants.map((tenantId) =>
          store.putPlacement(
            { ...placement(tenantId, 'shard-empty', 1), dedicated: true },
            undefined,
          ),
        ),
      );
      expect(
        results.filter((r) => r === DirectoryWriteResult.Written),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r === DirectoryWriteResult.ShardTaken),
      ).toHaveLength(7);
    });

    it('lets one of several concurrent updates win by version', async () => {
      const store = directory();
      const tenant = '0193f1c2-0000-7000-8000-0000000002f1';
      expect(
        await store.putPlacement(placement(tenant, 'shard-cas', 1), undefined),
      ).toBe(DirectoryWriteResult.Written);
      const results = await Promise.all(
        ['shard-cas-a', 'shard-cas-b', 'shard-cas-c', 'shard-cas-d'].map(
          (shard) => store.putPlacement(placement(tenant, shard, 2), 1),
        ),
      );
      expect(
        results.filter((r) => r === DirectoryWriteResult.Written),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r === DirectoryWriteResult.VersionConflict),
      ).toHaveLength(3);
      expect((await store.getPlacement(tenant))?.version).toBe(2);
    });
  });
});
