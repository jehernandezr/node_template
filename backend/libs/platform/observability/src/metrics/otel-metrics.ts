import {
  metrics,
  type Counter,
  type Histogram,
  type Meter,
} from '@opentelemetry/api';
import type { MetricAttributes } from './metric-attributes.js';
import { MetricsPort } from './metrics.port.js';

/**
 * `MetricsPort` adapter on the OpenTelemetry metrics API. Creates
 * each instrument only once. Without a registered SDK, the API is a no-op.
 */
export class OtelMetrics extends MetricsPort {
  /** Name of the instrumentation scope of the platform metrics. */
  static readonly SCOPE = '@platform/observability';

  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();

  constructor(
    private readonly meter: Meter = metrics.getMeter(OtelMetrics.SCOPE),
  ) {
    super();
  }

  increment(name: string, attributes: MetricAttributes = {}, value = 1): void {
    let counter = this.counters.get(name);
    if (counter === undefined) {
      counter = this.meter.createCounter(name);
      this.counters.set(name, counter);
    }
    counter.add(value, attributes);
  }

  record(name: string, value: number, attributes: MetricAttributes = {}): void {
    let histogram = this.histograms.get(name);
    if (histogram === undefined) {
      histogram = this.meter.createHistogram(name);
      this.histograms.set(name, histogram);
    }
    histogram.record(value, attributes);
  }
}
