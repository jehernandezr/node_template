import { newDb, type IMemoryDb } from 'pg-mem';
import type { Pool } from 'pg';
import { PgPoolConnection } from '../../src/lib/connection/pg-pool-connection.js';
import type { DatabaseConnection } from '../../src/lib/sql/sql-session.js';

/** Base `pg-mem` con su conexión de la capa. */
export interface MemoryDatabase {
  readonly db: IMemoryDb;
  readonly pool: Pool;
  readonly connection: DatabaseConnection;
  /** Ejecuta SQL directo, fuera de la capa, para preparar o revisar datos. */
  exec(sql: string): void;
}

/**
 * Crea una base en memoria. `pg-mem` no implementa plpgsql ni triggers, así que
 * sirve para tablas y sentencias; la auditoría se prueba con Testcontainers.
 */
export function memoryDatabase(): MemoryDatabase {
  const db = newDb();
  const adapters = db.adapters.createPg();
  const pool = new adapters.Pool() as Pool;
  return {
    db,
    pool,
    connection: new PgPoolConnection({ primary: pool }),
    exec: (sql) => {
      db.public.none(sql);
    },
  };
}
