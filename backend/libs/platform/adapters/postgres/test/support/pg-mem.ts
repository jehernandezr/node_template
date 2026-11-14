import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import {
  applyMigrations,
  type DatabaseConnection,
  type DatabaseRole,
  type LeasedSession,
  Database,
  EMPTY_PERSISTENCE_CONTEXT,
  OutboxMigration,
  PgPoolConnection,
  ProcessedMessagesMigration,
} from '@platform/persistence';
import type { Pool } from 'pg';
import { newDb } from 'pg-mem';

/**
 * pg-mem no implementa bloqueos de fila (`SKIP LOCKED`): esta conexión los quita.
 * La concurrencia entre relays se prueba con Postgres real.
 */
class NoRowLocks implements DatabaseConnection {
  constructor(private readonly inner: DatabaseConnection) {}

  async acquire(role: DatabaseRole): Promise<LeasedSession> {
    const leased = await this.inner.acquire(role);
    return {
      query: (sql, params) =>
        leased.query(sql.replace(/ FOR UPDATE SKIP LOCKED$/, ''), params),
      release: (error) => leased.release(error),
    };
  }

  close(): Promise<void> {
    return this.inner.close();
  }
}

export const START = new Date('2026-11-12T10:00:00.000Z');

/** Base `pg-mem` con las tablas del outbox y de mensajes procesados. */
export async function memoryShard(): Promise<{
  database: Database;
  clock: FixedClock;
  ids: SequentialIdGenerator;
}> {
  const db = newDb();
  const adapters = db.adapters.createPg();
  const pool = new adapters.Pool() as Pool;
  const clock = new FixedClock(START);
  const database = new Database({
    name: 'shard-1',
    connection: new NoRowLocks(new PgPoolConnection({ primary: pool })),
    clock,
    context: () => EMPTY_PERSISTENCE_CONTEXT,
  });
  await database.readPrimary((session) =>
    applyMigrations(session, [ProcessedMessagesMigration, OutboxMigration]),
  );
  return { database, clock, ids: new SequentialIdGenerator(START) };
}
