import type { Provider } from '@nestjs/common';
import { Clock, RandomSource } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { ResilienceMetricsListener } from '../events/resilience-metrics-listener.js';
import type { MetricsPort } from '@platform/observability';
import { ResilienceRegistry } from '../resilience-registry.js';
import { ResilienceRegistryFactory } from '../resilience-registry-factory.js';
import { RESILIENCE_METRICS, RESILIENCE_OPTIONS } from './resilience-tokens.js';
import type {
  ResilienceModuleExtras,
  ResilienceModuleOptions,
} from './resilience-module-options.js';

/** Providers of the resilience module. */
export class ResilienceProviders {
  static build(extras: ResilienceModuleExtras): Provider[] {
    const providers: Provider[] = [
      { provide: FailureClassifier, useFactory: () => new FailureClassifier() },
      ResilienceRegistryFactory,
      {
        provide: ResilienceRegistry,
        useFactory: (
          options: ResilienceModuleOptions,
          clock: Clock,
          random: RandomSource,
          classifier: FailureClassifier,
          factory: ResilienceRegistryFactory,
        ) =>
          factory.create(options.policies ?? {}, { clock, random, classifier }),
        inject: [
          RESILIENCE_OPTIONS,
          Clock,
          RandomSource,
          FailureClassifier,
          ResilienceRegistryFactory,
        ],
      },
    ];
    if (extras.metrics) {
      providers.push(
        { provide: RESILIENCE_METRICS, useExisting: extras.metrics },
        {
          provide: ResilienceMetricsListener,
          useFactory: (registry: ResilienceRegistry, metrics: MetricsPort) => {
            const listener = new ResilienceMetricsListener(metrics);
            listener.attach(registry);
            return listener;
          },
          inject: [ResilienceRegistry, RESILIENCE_METRICS],
        },
      );
    }
    return providers;
  }
}
