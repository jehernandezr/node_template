import type { Abstract, Provider, Type } from '@nestjs/common';
import {
  Clock,
  RandomSource,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import type { MetricsPort } from '@platform/observability';
import { CachePort } from '../cache-port.js';
import { CallerWait } from '../caller-wait.js';
import { CacheMetrics } from '../cache-metrics.js';
import { InMemoryCache } from '../in-memory-cache.js';
import { SingleFlight } from '../single-flight.js';
import { TtlJitter } from '../ttl-jitter.js';
import { CACHE_METRICS, CACHE_OPTIONS } from './cache-tokens.js';
import type {
  CacheModuleExtras,
  CacheModuleOptions,
} from './cache-module-options.js';

/** Providers del módulo raíz del caché y los que exporta. */
export class CacheProviders {
  static build(extras: CacheModuleExtras): Provider[] {
    return [
      { provide: Clock, useClass: SystemClock },
      { provide: RandomSource, useClass: SystemRandomSource },
      {
        provide: InMemoryCache,
        useFactory: (clock: Clock) => new InMemoryCache({ clock }),
        inject: [Clock],
      },
      { provide: CachePort, useExisting: extras.store ?? InMemoryCache },
      {
        provide: CallerWait,
        useFactory: (clock: Clock) => new CallerWait(clock),
        inject: [Clock],
      },
      {
        provide: SingleFlight,
        useFactory: (wait: CallerWait, options: CacheModuleOptions) =>
          new SingleFlight(wait, {
            maxKeyLength: options.singleFlightMaxKeyLength,
          }),
        inject: [CallerWait, CACHE_OPTIONS],
      },
      {
        provide: TtlJitter,
        useFactory: (random: RandomSource) => new TtlJitter(random),
        inject: [RandomSource],
      },
      ...CacheProviders.metricsProviders(extras),
    ];
  }

  static exports(
    extras: CacheModuleExtras,
  ): Array<Abstract<unknown> | Type<unknown>> {
    const base: Array<Abstract<unknown> | Type<unknown>> = [
      CachePort,
      CallerWait,
      SingleFlight,
      TtlJitter,
    ];
    return extras.metrics === undefined ? base : [...base, CacheMetrics];
  }

  private static metricsProviders(extras: CacheModuleExtras): Provider[] {
    if (extras.metrics === undefined) {
      return [];
    }
    const metrics: Type<MetricsPort> | Abstract<MetricsPort> = extras.metrics;
    return [
      { provide: CACHE_METRICS, useExisting: metrics },
      {
        provide: CacheMetrics,
        useFactory: (port: MetricsPort) => new CacheMetrics(port),
        inject: [CACHE_METRICS],
      },
    ];
  }
}
