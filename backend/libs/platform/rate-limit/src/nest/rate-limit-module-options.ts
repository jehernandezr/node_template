import type { Abstract, Type } from '@nestjs/common';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import type { RateLimiter } from '../rate-limiter.js';
import type { RateLimitKeyResolver } from './rate-limit-key-resolver.js';

/** Opciones de `RateLimitModule.forRoot`. */
export interface RateLimitModuleOptions {
  /** Si un limitador compartido que falla pasa al local. */
  readonly degradeLocally?: boolean;
  /** Divisor del límite mientras responde el local. Por defecto 1. */
  readonly localDivisor?: number;
}

/** Extras de `RateLimitModule.forRoot` que no son opciones del módulo. */
export interface RateLimitModuleExtras {
  /** Por defecto, el módulo es global. */
  isGlobal?: boolean;
  /** Limitador compartido. Su clase debe estar registrada por quien llama. */
  limiter?: Type<RateLimiter> | Abstract<RateLimiter>;
  /** Cómo se obtiene la llave de cada petición. Por defecto, la IP. */
  keyResolver?: Type<RateLimitKeyResolver> | Abstract<RateLimitKeyResolver>;
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
  logger?: Type<LoggerPort> | Abstract<LoggerPort>;
}
