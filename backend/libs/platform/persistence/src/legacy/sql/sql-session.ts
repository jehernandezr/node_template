import type { DatabaseRole } from '../enums.js';

/** Resultado de una sentencia. */
export interface SqlResult<Row> {
  readonly rows: Row[];
  /** Filas afectadas (INSERT, UPDATE, DELETE) o devueltas (SELECT). */
  readonly rowCount: number;
}

/** Algo que ejecuta SQL parametrizado con `$1, $2…`. Los valores van solo en `params`. */
export interface SqlSession {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<SqlResult<Row>>;
}

/** Sesión prestada por el pool. Se devuelve con `release` al terminar. */
export interface LeasedSession extends SqlSession {
  /** Devuelve la conexión. Con `error`, el pool la descarta en lugar de reusarla. */
  release(error?: unknown): Promise<void>;
}

/**
 * Puerto de conexión a una base lógica (un shard o el catálogo). Entrega
 * sesiones del primario o de la réplica. Los adaptadores son `TypeOrmConnection`
 * y `PgPoolConnection`.
 */
export interface DatabaseConnection {
  /** Toma una sesión del nodo pedido. Sin réplica configurada, la réplica es el primario. */
  acquire(role: DatabaseRole): Promise<LeasedSession>;
  /** Cierra los pools. */
  close(): Promise<void>;
}
