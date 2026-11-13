import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { ClaimState, Deadline } from '@platform/primitives';
import { idempotencyStoreContract } from '../../../test/support/idempotency-contract.js';
import { memoryDatabase } from '../../../test/support/pg-mem.js';
import { EMPTY_PERSISTENCE_CONTEXT } from '../context/persistence-context.js';
import { Database } from '../database.js';
import { IdempotencyKeysMigration } from '../migrations/shard-migrations.js';
import { applyMigrations } from '../migrations/sql-migration.js';
import { PostgresIdempotencyStore } from './postgres-idempotency-store.js';

const START = new Date('2026-11-12T10:00:00.000Z');

async function setup() {
  const memory = memoryDatabase();
  const clock = new FixedClock(START);
  const database = new Database({
    name: 'shard-1',
    connection: memory.connection,
    clock,
    context: () => EMPTY_PERSISTENCE_CONTEXT,
  });
  await database.readPrimary((session) =>
    applyMigrations(session, [IdempotencyKeysMigration]),
  );
  const store = new PostgresIdempotencyStore<{ orderId: string }>({
    databases: database,
    ids: new SequentialIdGenerator(START),
    clock,
  });
  return { store, clock, start: START, database, memory };
}

describe('PostgresIdempotencyStore on pg-mem', () => {
  idempotencyStoreContract(setup);

  it('purges completed results older than the cutoff', async () => {
    const { store, clock } = await setup();
    const deadline = Deadline.after(1_000, clock);
    const claim = await store.claim('k', { fingerprint: 'fp', deadline });
    if (claim.state !== ClaimState.Acquired) {
      throw new Error('expected acquired');
    }
    await store.complete('k', claim.claimToken, { orderId: 'o-1' });
    expect(await store.purgeCompleted(START.getTime())).toBe(0);
    expect(await store.purgeCompleted(START.getTime() + 1)).toBe(1);
  });

  it('refuses a table name that is not a plain identifier', () => {
    const memory = memoryDatabase();
    const database = new Database({ name: 'x', connection: memory.connection });
    expect(
      () =>
        new PostgresIdempotencyStore({
          databases: database,
          ids: new SequentialIdGenerator(),
          table: 'keys; drop table x',
        }),
    ).toThrow('table must be a plain SQL identifier');
  });
});
