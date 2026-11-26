import type { MetricsPort } from '@platform/observability';
import type { ResilienceRegistry } from '../resilience-registry.js';
import type { ResilienceEvent } from './resilience-event.js';
import { ResilienceMetricAttribute } from './resilience-metric-attribute.enum.js';
import { ResilienceMetricName } from './resilience-metric-name.enum.js';

/** Translates the resilience events into metrics of the platform port. */
export class ResilienceMetricsListener {
  constructor(private readonly metrics: MetricsPort) {}

  /**
   * Turns a policy event into metrics.
   * @param event Policy event.
   */
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

  /**
   * Subscribes the listener to the registry. @returns function that removes it.
   * @param source Registry to listen to.
   */
  attach(source: Pick<ResilienceRegistry, 'subscribe'>): () => void {
    return source.subscribe((event) => {
      this.handle(event);
    });
  }
}
