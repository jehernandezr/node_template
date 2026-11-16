/** Límites del ciclo de suspensión de un paso. */
export interface SuspendPolicy {
  readonly maxSuspendAttempts: number;
  readonly maxSuspendAgeMs: number;
  /** Espera antes de reintentar tras el intento fallido dado (desde 1). */
  readonly backoff: (attempt: number) => number;
}
