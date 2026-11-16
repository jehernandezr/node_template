import type { FailureKind } from '@platform/kernel';

/** Opciones de un {@link PersistenceError}. */
export interface PersistenceErrorOptions {
  /** Datos de diagnóstico. Nunca valores de filas ni parámetros de la sentencia. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  /** Clase de la falla. Solo `QueryFailed` la toma de aquí; el resto la fija por código. */
  readonly failureKind?: FailureKind;
}
