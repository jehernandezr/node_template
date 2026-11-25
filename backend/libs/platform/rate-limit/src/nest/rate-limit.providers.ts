import type { Provider } from '@nestjs/common';
import { Clock, SystemClock } from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { DegradingRateLimiter } from '../degrading-rate-limiter.js';
import { InMemoryRateLimiter } from '../in-memory-rate-limiter.js';
import { ObservabilityRateLimitDegradationReporter } from '../observability-rate-limit-degradation-reporter.js';
import { RateLimitDegradationReporter } from '../rate-limit-degradation-reporter.js';
import { RateLimiter } from '../rate-limiter.js';
import { IpRateLimitKeyResolver } from './ip-rate-limit-key-resolver.js';
import { RateLimitKeyResolver } from './rate-limit-key-resolver.js';
import type {
  RateLimitModuleExtras,
  RateLimitModuleOptions,
} from './rate-limit-module-options.js';
import {
  RATE_LIMIT_LOGGER,
  RATE_LIMIT_METRICS,
  RATE_LIMIT_OPTIONS,
} from './rate-limit-tokens.js';
import { RateLimitGuard } from './rate-limit.guard.js';

/** Providers of the rate limit module. */
export class RateLimitProviders {
  static build(extras: RateLimitModuleExtras): Provider[] {
    const providers: Provider[] = [
      { provide: Clock, useClass: SystemClock },
      {
        provide: InMemoryRateLimiter,
        useFactory: (clock: Clock) => new InMemoryRateLimiter({ clock }),
        inject: [Clock],
      },
      {
        provide: RateLimitDegradationReporter,
        useFactory: (metrics?: MetricsPort, logger?: LoggerPort) =>
          new ObservabilityRateLimitDegradationReporter(metrics, logger),
        inject: [
          { token: RATE_LIMIT_METRICS, optional: true },
          { token: RATE_LIMIT_LOGGER, optional: true },
        ],
      },
      IpRateLimitKeyResolver,
      {
        provide: RateLimitKeyResolver,
        useExisting: extras.keyResolver ?? IpRateLimitKeyResolver,
      },
      RateLimitGuard,
    ];
    if (extras.metrics) {
      providers.push({
        provide: RATE_LIMIT_METRICS,
        useExisting: extras.metrics,
      });
    }
    if (extras.logger) {
      providers.push({
        provide: RATE_LIMIT_LOGGER,
        useExisting: extras.logger,
      });
    }
    providers.push(RateLimitProviders.limiterProvider(extras));
    return providers;
  }

  /**
   * Without its own limiter, the local one. With one, it degrades to the local one only if
   * `degradeLocally` is enabled.
   */
  private static limiterProvider(extras: RateLimitModuleExtras): Provider {
    if (extras.limiter === undefined) {
      return { provide: RateLimiter, useExisting: InMemoryRateLimiter };
    }
    return {
      provide: RateLimiter,
      useFactory: (
        primary: RateLimiter,
        options: RateLimitModuleOptions,
        inMemory: InMemoryRateLimiter,
        reporter: RateLimitDegradationReporter,
        clock: Clock,
      ) =>
        options.degradeLocally === true
          ? new DegradingRateLimiter({
              primary,
              localDivisor: options.localDivisor ?? 1,
              fallback: inMemory,
              clock,
              reporter,
            })
          : primary,
      inject: [
        extras.limiter,
        RATE_LIMIT_OPTIONS,
        InMemoryRateLimiter,
        RateLimitDegradationReporter,
        Clock,
      ],
    };
  }
}
