import type { Clock } from '@platform/kernel';
import type { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';
import type { RateLimitDegradedListener } from './rate-limit-degraded-listener.js';
import type { RateLimiter } from './rate-limiter.js';

/** Opciones de {@link DegradingRateLimiter}. */
export interface DegradingRateLimiterOptions {
  /** Limitador compartido entre instancias, normalmente el de Valkey. */
  readonly primary: RateLimiter;
  /**
   * Divide el límite de cada regla mientras responde el limitador local, por
   * lo general el número de instancias del servicio: cada una cuenta solo su
   * tráfico, y entre todas no deberían pasar mucho más del límite global.
   */
  readonly localDivisor: number;
  /** Limitador local. Por defecto un `InMemoryRateLimiter` con `clock`. */
  readonly fallback?: RateLimiter;
  /** Reloj del limitador local por defecto. */
  readonly clock?: Clock;
  /**
   * Se llama con cada falla del limitador compartido. Una excepción dentro de
   * él se ignora.
   */
  readonly onDegraded?: RateLimitDegradedListener;
  /** Reporta cada falla. Por defecto no hace nada. */
  readonly reporter?: RateLimitDegradationReporter;
}
