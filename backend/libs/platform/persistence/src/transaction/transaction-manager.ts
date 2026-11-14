import type { TransactionManager, UnitOfWork } from '@platform/primitives';
import type { SqlSession } from '../sql/sql-session.js';

/**
 * Unidad de trabajo de Postgres. Vive en `AsyncLocalStorage`, así todo lo que
 * corre dentro de `runInTransaction` (repositorios, `PostgresIdempotencyStore`,
 * el outbox) usa la misma sesión. Solo los adaptadores de esta capa ven la
 * sesión; el resto de la plataforma depende de `UnitOfWork` de primitives.
 */
export interface SqlUnitOfWork extends UnitOfWork {
  /** Sesión de la transacción. Cada sentencia lleva el comentario con `traceId`. */
  readonly session: SqlSession;
}

/**
 * Puerto de transacciones de Postgres: `runInTransaction(fn)` abre una
 * transacción en la base del contexto, o se une a la que ya está abierta en la
 * misma base. Tocar otra base dentro de ella lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 */
export type SqlTransactionManager = TransactionManager<SqlUnitOfWork>;
