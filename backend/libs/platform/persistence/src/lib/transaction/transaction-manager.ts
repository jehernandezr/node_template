import type { IsolationLevel } from '../enums.js';
import type { SqlSession } from '../sql/sql-session.js';

/** Efecto que corre después del commit (o del rollback). */
export type TransactionHook = () => Promise<void> | void;

/**
 * Unidad de trabajo: una transacción abierta sobre una base lógica. Vive en
 * `AsyncLocalStorage`, así todo lo que corre dentro de `runInTransaction`
 * (repositorios, `PostgresIdempotencyStore`, el outbox) usa la misma sesión.
 */
export interface UnitOfWork {
  /** Nombre de la base lógica (el shard) donde vive la transacción. */
  readonly database: string;
  /** Sesión de la transacción. Cada sentencia lleva el comentario con `traceId`. */
  readonly session: SqlSession;
  /**
   * Registra un efecto para después del commit: publicar eventos, invalidar
   * caché, avisar a otro proceso. Corre fuera de la transacción, en orden de
   * registro. Si falla se reporta con `onHookError` y no deshace el commit.
   * Firma compatible con `InvalidateOptions.afterCommit` de `@platform/cache`.
   */
  afterCommit(hook: TransactionHook): void;
  /** Registra un efecto que corre solo si la transacción se deshace. */
  afterRollback(hook: TransactionHook): void;
}

/** Opciones de {@link TransactionManager.runInTransaction}. */
export interface TransactionOptions {
  readonly isolation?: IsolationLevel;
  readonly readOnly?: boolean;
  /**
   * Tiempo máximo de cada sentencia de la transacción (`SET LOCAL statement_timeout`).
   * Sin valor se usa el de la base.
   */
  readonly statementTimeoutMs?: number;
}

/**
 * Puerto de transacciones (Unit of Work). Lo usan los casos de uso y, en la
 * ola 2, internal-api (guardar `processed_operations` con los efectos) y
 * messaging (outbox y `processed_messages` en la misma transacción).
 *
 * - `runInTransaction(fn)` abre una transacción en la base del contexto, o se
 *   une a la que ya está abierta en la misma base (las opciones de la externa
 *   mandan). Tocar otra base dentro de ella lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 * - Si `fn` lanza, la transacción se deshace y el error sale tal cual.
 * - `afterCommit` fuera de una transacción corre el efecto de inmediato, porque
 *   no hay nada que esperar.
 */
export interface TransactionManager {
  runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
  /** La unidad de trabajo abierta en este contexto asíncrono, si hay una. */
  current(): UnitOfWork | undefined;
  isInTransaction(): boolean;
  afterCommit(hook: TransactionHook): void;
}
