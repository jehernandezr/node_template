import type { TransactionHook } from '@platform/kernel';
import type { CacheTransactions } from './cache-aside.options.js';

/** Ámbito sin transacción: el caché siempre está activo. Es el valor por defecto de `CacheAside`. */
export class NoTransactionScope implements CacheTransactions {
  isInTransaction(): boolean {
    return false;
  }

  /** Sin transacción no hay commit que esperar: el efecto corre ya, como en `TransactionManager`. */
  afterCommit(hook: TransactionHook): void {
    void hook();
  }
}
