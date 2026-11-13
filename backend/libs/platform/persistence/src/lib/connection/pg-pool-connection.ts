import type { Pool, PoolClient } from 'pg';
import { DatabaseRole } from '../enums.js';
import type {
  DatabaseConnection,
  LeasedSession,
  SqlResult,
} from '../sql/sql-session.js';

/** Pools de `pg` del primario y, opcionalmente, de la réplica. */
export interface PgPoolConnectionOptions {
  readonly primary: Pool;
  /** Pool de la réplica de lectura. Sin él, las lecturas van al primario. */
  readonly replica?: Pool;
}

class PgLeasedSession implements LeasedSession {
  private released = false;

  constructor(private readonly client: PoolClient) {}

  async query<Row>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<SqlResult<Row>> {
    const result = await this.client.query(sql, [...params]);
    return {
      rows: result.rows as Row[],
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  async release(error?: unknown): Promise<void> {
    if (this.released) {
      return;
    }
    this.released = true;
    this.client.release(
      error === undefined
        ? undefined
        : error instanceof Error
          ? error
          : new Error('session discarded'),
    );
  }
}

/**
 * Adaptador de {@link DatabaseConnection} sobre `pg.Pool`. Sirve para el
 * catálogo, para procesos sin TypeORM y para pruebas con `pg-mem`.
 */
export class PgPoolConnection implements DatabaseConnection {
  constructor(private readonly options: PgPoolConnectionOptions) {}

  async acquire(role: DatabaseRole): Promise<LeasedSession> {
    const pool =
      role === DatabaseRole.Replica
        ? (this.options.replica ?? this.options.primary)
        : this.options.primary;
    return new PgLeasedSession(await pool.connect());
  }

  async close(): Promise<void> {
    await this.options.primary.end();
    if (
      this.options.replica !== undefined &&
      this.options.replica !== this.options.primary
    ) {
      await this.options.replica.end();
    }
  }
}
