import type { Abstract, Type } from '@nestjs/common';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import type { RateLimiter } from '../rate-limiter.js';
import type { RateLimitKeyResolver } from './rate-limit-key-resolver.js';

/** Options of `RateLimitModule.forRoot`. */
export interface RateLimitModuleOptions {
  /** Whether a failing shared limiter falls back to the local one. */
  readonly degradeLocally?: boolean;
  /** Divisor of the limit while the local one responds. Defaults to 1. */
  readonly localDivisor?: number;
}

/** Extras of `RateLimitModule.forRoot` that are not module options. */
export interface RateLimitModuleExtras {
  /** The module is global by default. */
  isGlobal?: boolean;
  /** Shared limiter. Its class must be registered by the caller. */
  limiter?: Type<RateLimiter> | Abstract<RateLimiter>;
  /** How the key of each request is obtained. Defaults to the IP. */
  keyResolver?: Type<RateLimitKeyResolver> | Abstract<RateLimitKeyResolver>;
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
  logger?: Type<LoggerPort> | Abstract<LoggerPort>;
}
