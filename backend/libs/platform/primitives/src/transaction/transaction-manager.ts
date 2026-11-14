/** Efecto que corre después del commit (o del rollback). */
export type TransactionHook = () => Promise<void> | void;

/** Nivel de aislamiento de una transacción. */
export enum IsolationLevel {
  ReadCommitted = 'READ COMMITTED',
  RepeatableRead = 'REPEATABLE READ',
  Serializable = 'SERIALIZABLE',
}

/**
 * Unidad de trabajo: una transacción abierta sobre una base lógica. No expone
 * la sesión de la base; el adaptador que la necesita (un repositorio, el
 * outbox) la toma de su propio `TransactionManager`.
 */
export interface UnitOfWork {
  /** Nombre de la base lógica (el shard) donde vive la transacción. */
  readonly database: string;
  /**
   * Registra un efecto para después del commit: publicar eventos, invalidar
   * caché, avisar a otro proceso. Corre fuera de la transacción, en orden de
   * registro. Si falla se reporta y no deshace el commit.
   */
  afterCommit(hook: TransactionHook): void;
  /** Registra un efecto que corre solo si la transacción se deshace. */
  afterRollback(hook: TransactionHook): void;
}

/** Opciones de {@link TransactionManager.runInTransaction}. */
export interface TransactionOptions {
  readonly isolation?: IsolationLevel;
  readonly readOnly?: boolean;
  /** Tiempo máximo de cada sentencia de la transacción. Sin valor se usa el de la base. */
  readonly statementTimeoutMs?: number;
}

/**
 * Puerto de transacciones (Unit of Work). Lo usan los casos de uso, el router
 * interno (guardar el resultado con los efectos) y el bus de mensajes (el
 * outbox en la misma transacción).
 *
 * - `runInTransaction(fn)` abre una transacción, o se une a la que ya está
 *   abierta en la misma base (las opciones de la externa mandan).
 * - Si `fn` lanza, la transacción se deshace y el error sale tal cual.
 * - `afterCommit` fuera de una transacción corre el efecto de inmediato, porque
 *   no hay nada que esperar.
 */
export interface TransactionManager<U extends UnitOfWork = UnitOfWork> {
  runInTransaction<T>(
    fn: (uow: U) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
  /** La unidad de trabajo abierta en este contexto asíncrono, si hay una. */
  current(): U | undefined;
  isInTransaction(): boolean;
  afterCommit(hook: TransactionHook): void;
}
