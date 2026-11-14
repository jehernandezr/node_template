import type { TransactionHook } from './transaction-hook.js';

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
