import type { IsolationLevel } from './isolation-level.js';

/** Opciones de `TransactionManager.runInTransaction`. */
export interface TransactionOptions {
  readonly isolation?: IsolationLevel;
  readonly readOnly?: boolean;
  /** Tiempo máximo de cada sentencia de la transacción. Sin valor se usa el de la base. */
  readonly statementTimeoutMs?: number;
}
