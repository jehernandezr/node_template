import type { Clock } from '@platform/kernel';

/** Ajustes y ganchos de un {@link ConsecutiveCircuitBreaker}. */
export interface CircuitBreakerOptions {
  /** Fallas contadas consecutivas que abren el circuito. */
  readonly consecutiveFailures: number;
  /** Tiempo que el circuito queda abierto antes de permitir una llamada de prueba. */
  readonly halfOpenAfterMs: number;
  /** Fuente de tiempo, para que las pruebas decidan cuándo se medio abre. */
  readonly clock: Clock;
  /** Qué errores cuentan como falla. Los demás pasan sin abrir el circuito. */
  readonly counts: (error: unknown) => boolean;
  /** Error que se lanza para una llamada rechazada con el circuito abierto. */
  readonly rejectWith: () => Error;
  readonly onBreak?: (error: unknown) => void;
  readonly onHalfOpen?: () => void;
  readonly onReset?: () => void;
}
