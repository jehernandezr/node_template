import { Module, type DynamicModule } from '@nestjs/common';
import { ResilienceRegistry } from '@platform/resilience';
import { TransactionManager, IdGenerator } from '@platform/kernel';
import { CachePort } from '../cache-port.js';
import { CallerWait } from '../caller-wait.js';
import { CacheAside } from '../cache-aside.js';
import { CacheMetrics } from '../cache-metrics.js';
import { MetricsCacheErrorReporter } from '../metrics-cache-error-reporter.js';
import { NoTransactionScope } from '../no-transaction-scope.js';
import { NoopCacheErrorReporter } from '../noop-cache-error-reporter.js';
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
  /** Registers the cache port and the collaborators shared by every namespace. */
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
        {
          provide: cacheAsideToken(namespace),
          useFactory: (
            cache: CachePort,
            resilience: ResilienceRegistry,
            wait: CallerWait,
            singleFlight: SingleFlight,
            jitter: TtlJitter,
            ids: IdGenerator,
            noTransactions: NoTransactionScope,
            noopReporter: NoopCacheErrorReporter,
            transactions?: TransactionManager,
            metrics?: CacheMetrics,
          ) =>
            new CacheAside(
              cache,
              new VersionedKeyspace(cache, { prefix: namespace, ids }),
              { resilience },
              {
                singleFlight,
                jitter,
                wait,
                transactions: transactions ?? noTransactions,
                reporter: metrics
                  ? new MetricsCacheErrorReporter(metrics, namespace)
                  : noopReporter,
              },
            ),
          inject: [
            CachePort,
            ResilienceRegistry,
            CallerWait,
            SingleFlight,
            TtlJitter,
            IdGenerator,
            NoTransactionScope,
            NoopCacheErrorReporter,
            { token: TransactionManager, optional: true },
            { token: CacheMetrics, optional: true },
          ],
        },
      ],
      exports: [cacheAsideToken(namespace)],
    };
  }
}
