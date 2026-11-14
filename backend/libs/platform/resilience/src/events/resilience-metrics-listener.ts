import type { MetricsPort } from '@platform/observability';
import type { ResilienceRegistry } from '../resilience-registry.js';
import type { ResilienceEvent } from './resilience-event.js';
import { ResilienceMetricAttribute } from './resilience-metric-attribute.enum.js';
import { ResilienceMetricName } from './resilience-metric-name.enum.js';

/** Traduce los eventos de resiliencia a métricas del puerto de la plataforma. */
export class ResilienceMetricsListener {
  constructor(private readonly metrics: MetricsPort) {}

  handle(event: ResilienceEvent): void {
    const code = event.detail?.errorCode ?? event.detail?.errorName;
    const attributes: Record<string, string> = {
      [ResilienceMetricAttribute.Policy]: event.policy,
      [ResilienceMetricAttribute.Dependency]: event.dependencyKey,
      [ResilienceMetricAttribute.Kind]: event.kind,
    };
    if (code !== undefined) {
      attributes[ResilienceMetricAttribute.ErrorCode] = code;
    }
    this.metrics.increment(ResilienceMetricName.Events, attributes);
    const delayMs = event.detail?.delayMs;
    if (delayMs !== undefined) {
      this.metrics.record(ResilienceMetricName.RetryDelay, delayMs, {
        [ResilienceMetricAttribute.Policy]: event.policy,
        [ResilienceMetricAttribute.Dependency]: event.dependencyKey,
      });
    }
  }

  /** Suscribe el listener al registro. @returns función que lo quita. */
  attach(source: Pick<ResilienceRegistry, 'subscribe'>): () => void {
    return source.subscribe((event) => {
      this.handle(event);
    });
  }
}
