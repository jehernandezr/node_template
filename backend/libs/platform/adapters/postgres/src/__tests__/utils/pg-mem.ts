import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  applyMigrations,
  type DatabaseConnection,
  type DatabaseRole,
  type LeasedSession,
  Database,
  EMPTY_PERSISTENCE_CONTEXT,
  PgPoolConnection,
  type SqlMigration,
} from '@platform/persistence';
import type { Pool } from 'pg';
import { DataType, newDb, type IMemoryDb } from 'pg-mem';
import { messagingMigrations } from '../../shard-migrations.js';

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
        leased.query(
          sql.replace(/ FOR UPDATE( OF \w+)? SKIP LOCKED$/, ''),
          params,
        ),
      release: (error) => leased.release(error),
    };
  }

  close(): Promise<void> {
    return this.inner.close();
  }
}

export const START = new Date('2026-11-12T10:00:00.000Z');

/** Base `pg-mem` con su conexión de la capa. */
export interface MemoryDatabase {
  readonly db: IMemoryDb;
  readonly pool: Pool;
  readonly connection: DatabaseConnection;
  /** Ejecuta SQL directo, fuera de la capa, para preparar o revisar datos. */
  exec(sql: string): void;
}

/**
 * Base en memoria. pg-mem no tiene candados consultivos: se registran como
 * funciones vacías, porque cada prueba usa una sola sesión para migrar.
 */
export function memoryDatabase(): MemoryDatabase {
  const db = newDb();
  for (const name of ['pg_advisory_lock', 'pg_advisory_unlock']) {
    db.public.registerFunction({
      name,
      args: [DataType.bigint],
      returns: DataType.bool,
      implementation: () => true,
      impure: true,
    });
  }
  const adapters = db.adapters.createPg();
  const pool = new adapters.Pool() as Pool;
  return {
    db,
    pool,
    connection: new NoRowLocks(new PgPoolConnection({ primary: pool })),
    exec: (sql) => {
      db.public.none(sql);
    },
  };
}

/** Base `pg-mem` de un shard con las migraciones dadas (por defecto, las de mensajería). */
export async function memoryShard(
  migrations: readonly SqlMigration[] = messagingMigrations,
): Promise<{
  database: Database;
  clock: FixedClock;
  ids: SequentialIdGenerator;
}> {
  const memory = memoryDatabase();
  const clock = new FixedClock(START);
  const database = new Database({
    name: 'shard-1',
    connection: memory.connection,
    context: () => EMPTY_PERSISTENCE_CONTEXT,
  });
  await database.readPrimary((session) => applyMigrations(session, migrations));
  return { database, clock, ids: new SequentialIdGenerator(START) };
}
