import { DatabaseRole } from '../../src/lib/enums.js';
import type {
  DatabaseConnection,
  LeasedSession,
  SqlResult,
} from '../../src/lib/sql/sql-session.js';

/** Sentencia registrada por {@link RecordingConnection}. */
export interface RecordedStatement {
  readonly session: number;
  readonly role: DatabaseRole;
  readonly sql: string;
  readonly params: readonly unknown[];
}

/**
 * Conexión falsa que registra cada sentencia con su sesión y su rol. Devuelve
 * filas vacías, salvo lo que diga `respond`, y falla en las sentencias que
 * cumplan `failOn`.
 */
export class RecordingConnection implements DatabaseConnection {
  readonly statements: RecordedStatement[] = [];
  readonly released: { session: number; discarded: boolean }[] = [];
  failOn: ((sql: string) => unknown) | undefined;
  respond:
    | ((sql: string) => SqlResult<Record<string, unknown>> | undefined)
    | undefined;
  acquireError: unknown;
  private sessions = 0;

  async acquire(role: DatabaseRole): Promise<LeasedSession> {
    if (this.acquireError !== undefined) {
      throw this.acquireError;
    }
    this.sessions += 1;
    const session = this.sessions;
    return {
      query: async <Row>(sql: string, params: readonly unknown[] = []) => {
        this.statements.push({ session, role, sql, params });
        const failure = this.failOn?.(sql);
        if (failure !== undefined) {
          throw failure;
        }
        const response = this.respond?.(sql);
        return (response ?? { rows: [], rowCount: 0 }) as SqlResult<Row>;
      },
      release: async (error?: unknown) => {
        this.released.push({ session, discarded: error !== undefined });
      },
    };
  }

  async close(): Promise<void> {
    return undefined;
  }

  /** Sentencias sin el comentario de traza. */
  sql(): string[] {
    return this.statements.map((statement) =>
      statement.sql.replace(/^\/\* [^*]* \*\/ /, ''),
    );
  }
}

export { DatabaseRole };
