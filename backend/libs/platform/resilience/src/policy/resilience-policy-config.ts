import type { RetryPolicy } from '@platform/primitives';
import type { TimeoutStrategy } from './timeout-strategy.enum.js';

/** Reintentos de una política. La política cuenta todos los intentos, el primero incluido. */
export interface ResilienceRetryConfig {
  /** Cuántos intentos y cómo crece la espera entre ellos. */
  readonly policy: RetryPolicy;
  /**
   * Tope, en milisegundos, de la pista `Retry-After` del servidor. El plazo
   * de la llamada lo acota más. Por defecto, 60 s.
   */
  readonly maxRetryAfterMs?: number;
}

/** Ajustes del circuit breaker. */
export interface ResilienceCircuitBreakerConfig {
  /** Fallas transitorias consecutivas que abren el circuito. */
  readonly consecutiveFailures: number;
  /** Tiempo que el circuito queda abierto antes de permitir una llamada de prueba. */
  readonly halfOpenAfterMs: number;
}

/** Ajustes del bulkhead. */
export interface ResilienceBulkheadConfig {
  /** Llamadas simultáneas máximas. */
  readonly limit: number;
  /** Llamadas que pueden esperar un cupo antes de ser rechazadas. */
  readonly queue: number;
}

/** Política de resiliencia declarada para una dependencia saliente. */
export interface ResiliencePolicyConfig {
  /** Tiempo máximo de cada intento. */
  readonly timeoutMs: number;
  /** Por defecto, `TimeoutStrategy.Aggressive`. */
  readonly timeoutStrategy?: TimeoutStrategy;
  /** Si la señal se aborta al volver la llamada. Por defecto sí; las transmisiones lo desactivan. */
  readonly abortOnReturn?: boolean;
  /** Presupuesto de toda la llamada, reintentos incluidos. */
  readonly totalTimeoutMs?: number;
  readonly retry?: ResilienceRetryConfig;
  readonly circuitBreaker?: ResilienceCircuitBreakerConfig;
  readonly bulkhead?: ResilienceBulkheadConfig;
  /**
   * Decide qué errores se reintentan y cuentan para el breaker. Por defecto,
   * el clasificador de fallas de `@platform/primitives`.
   */
  readonly isTransient?: (error: unknown) => boolean;
}
