import { FixedClock } from '@platform/kernel/testing';
import { createEnvelope, InMemoryOutboxStore } from '@platform/messaging';
import type { Database } from '@platform/persistence';
import {
  type OutboxContractEnv,
  outboxStoreContract,
} from '../../test/support/outbox-contract.js';
import { memoryShard, START } from '../../test/support/pg-mem.js';
import { PostgresOutboxStore } from './postgres-outbox-store.js';

async function setup(): Promise<
  OutboxContractEnv & { database: Database; store: PostgresOutboxStore }
> {
  const { database, clock } = await memoryShard();
  const store = new PostgresOutboxStore({ databases: database, clock });
  return {
    database,
    store,
    add: (envelope, options) =>
      database.runInTransaction((uow) =>
        store.append(
          {
            envelope,
            groupId: options.groupId,
            delayMs: options.delayMs,
            createdAt: options.now,
          },
          uow,
        ),
      ),
    get: (id) => store.get(id),
  };
}

const envelope = (id: string) =>
  createEnvelope(
    { type: 't', source: 's', data: null },
    { newId: () => id, now: () => START },
  );

describe('PostgresOutboxStore on pg-mem', () => {
  outboxStoreContract(setup);

  it('ignores a second append with the same envelope id', async () => {
    const env = await setup();
    const append = () =>
      env.database.runInTransaction((uow) =>
        env.store.append(
          { envelope: envelope('a'), createdAt: START, groupId: 'g' },
          uow,
        ),
      );
    await append();
    await append();
    expect(
      (
        await env.store.claimPending({
          now: START,
          limit: 10,
          lease: { owner: 'r', token: 't' },
          leaseMs: 1_000,
        })
      ).length,
    ).toBe(1);
  });

  it('purges published records past retention and keeps dead ones unless asked', async () => {
    const { database, clock } = await memoryShard();
    const store = new PostgresOutboxStore({ databases: database, clock });
    for (const id of ['pub', 'dead', 'open']) {
      await database.runInTransaction((uow) =>
        store.append({ envelope: envelope(id), createdAt: START }, uow),
      );
    }
    const lease = { owner: 'r', token: 't' };
    await store.claimPending({ now: START, limit: 2, lease, leaseMs: 1_000 });
    await store.markPublished('pub', lease);
    await store.markDead('dead', lease, 'no route');

    const later = new Date(START.getTime() + 1_000);
    expect(await store.purge({ before: START })).toBe(0);
    expect(await store.purge({ before: later })).toBe(1);
    expect(await store.get('pub')).toBeUndefined();
    expect(await store.get('dead')).toBeDefined();
    expect(await store.purge({ before: later, includeDead: true })).toBe(1);
    expect(await store.get('open')).toBeDefined();
  });

  it('refuses a table name that is not a plain identifier', async () => {
    const { database } = await memoryShard();
    expect(
      () => new PostgresOutboxStore({ databases: database, table: 'x; DROP' }),
    ).toThrow();
  });
});

describe('InMemoryOutboxStore (reference)', () => {
  outboxStoreContract(() => {
    const store = new InMemoryOutboxStore({ clock: new FixedClock(START) });
    return Promise.resolve({
      store,
      add: (envelope, options) => {
        store.add(envelope, options);
        return Promise.resolve();
      },
      get: (id) => Promise.resolve(store.get(id)),
    });
  });
});
