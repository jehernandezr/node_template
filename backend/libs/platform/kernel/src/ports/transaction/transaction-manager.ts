import type { TransactionHook } from './transaction-hook.js';
import type { TransactionOptions } from './transaction-options.js';
import type { UnitOfWork } from './unit-of-work.js';

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
 *
 * Todos sus miembros son públicos y abstractos, así que un objeto literal con
 * esos métodos sigue sirviendo de doble.
 */
export abstract class TransactionManager<U extends UnitOfWork = UnitOfWork> {
  abstract runInTransaction<T>(
    fn: (uow: U) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  /** La unidad de trabajo abierta en este contexto asíncrono, si hay una. */
  abstract current(): U | undefined;

  abstract isInTransaction(): boolean;

  abstract afterCommit(hook: TransactionHook): void;
}
