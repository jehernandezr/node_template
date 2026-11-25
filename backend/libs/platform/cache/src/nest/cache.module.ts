import { Module, type DynamicModule } from '@nestjs/common';
import { ResilienceRegistry } from '@platform/resilience';
import {
  TransactionManager,
  Clock,
  SystemClock,
  IdGenerator,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { CachePort } from '../cache-port.js';
import { CallerWait } from '../caller-wait.js';
import { CacheAside } from '../cache-aside.js';
import { CacheMetrics } from '../cache-metrics.js';
import { MetricsCacheErrorReporter } from '../metrics-cache-error-reporter.js';
import { SingleFlight } from '../single-flight.js';
import { TtlJitter } from '../ttl-jitter.js';
import { VersionedKeyspace } from '../versioned-keyspace.js';
import { CacheConfigurableModule } from './cache.module-definition.js';
import { CacheFeatureModule } from './cache-feature.module.js';
import { cacheAsideToken } from './cache-tokens.js';
import type {
  CacheFeatureOptions,
  CacheModuleExtras,
  CacheModuleOptions,
} from './cache-module-options.js';

/**
 * Application cache. `forRoot` registers the port and its collaborators
 * (global by default); `forFeature` provides one `CacheAside` per namespace.
 */
@Module({})
export class CacheModule extends CacheConfigurableModule {
  static override forRoot(
    options: CacheModuleOptions & Partial<CacheModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  /** Returns the namespace's `CacheAside`, with its versioned keys under that name. */
  static forFeature(feature: CacheFeatureOptions): DynamicModule {
    const { namespace } = feature;
    return {
      module: CacheFeatureModule,
      imports: feature.imports ?? [],
      providers: [
        { provide: Clock, useClass: SystemClock },
        {
          provide: IdGenerator,
          useFactory: (clock: Clock) => new UuidV7IdGenerator(clock),
          inject: [Clock],
        },
        {
          provide: cacheAsideToken(namespace),
          useFactory: (
            cache: CachePort,
            resilience: ResilienceRegistry,
            wait: CallerWait,
            singleFlight: SingleFlight,
            jitter: TtlJitter,
            ids: IdGenerator,
            transactions?: TransactionManager,
            metrics?: CacheMetrics,
          ) =>
            new CacheAside(
              cache,
              new VersionedKeyspace(cache, { prefix: namespace, ids }),
              {
                resilience,
                transactions,
                reporter: metrics
                  ? new MetricsCacheErrorReporter(metrics, namespace)
                  : undefined,
              },
              { singleFlight, jitter, wait },
            ),
          inject: [
            CachePort,
            ResilienceRegistry,
            CallerWait,
            SingleFlight,
            TtlJitter,
            IdGenerator,
            { token: TransactionManager, optional: true },
            { token: CacheMetrics, optional: true },
          ],
        },
      ],
      exports: [cacheAsideToken(namespace)],
    };
  }
}
