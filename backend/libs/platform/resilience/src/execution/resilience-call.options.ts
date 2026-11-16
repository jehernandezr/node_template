import type { Deadline } from '@platform/primitives';

/** Opciones de cada llamada a `ResilienceRegistry.execute`. */
export interface ResilienceCallOptions {
  /** Permite reintentos. Por defecto no: una llamada que falla nunca se repite. */
  readonly idempotent?: boolean;
  /** Dependencia cuyo breaker y bulkhead se usan. Por defecto, el nombre de la política. */
  readonly dependencyKey?: string;
  /** Cancelación del llamador: corta reintentos, esperas pendientes y rechaza con el motivo de la señal. */
  readonly signal?: AbortSignal;
  /**
   * Plazo del llamador. Toda la llamada, reintentos y esperas incluidos, no
   * pasa de él; si la política también tiene presupuesto, gana el más cercano.
   */
  readonly deadline?: Deadline;
  /** Presupuesto de toda la llamada, reintentos incluidos. Reemplaza el de la política. */
  readonly totalTimeoutMs?: number;
}

/** Lo que la operación sabe del intento que ejecuta. */
export interface ResilienceAttempt {
  /** Número del intento, desde 1. */
  readonly number: number;
  /**
   * Límite de este intento: `deadline.child(timeoutMs)` del plazo de la
   * llamada, o `timeoutMs` desde ahora si la llamada no tiene plazo. Se pasa
   * hacia abajo.
   */
  readonly deadline: Deadline;
}

/** Operación que ejecuta `ResilienceRegistry.execute`. */
export type ResilientOperation<T> = (
  signal: AbortSignal,
  attempt: ResilienceAttempt,
) => Promise<T>;
