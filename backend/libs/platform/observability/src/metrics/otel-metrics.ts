import {
  metrics,
  type Counter,
  type Histogram,
  type Meter,
} from '@opentelemetry/api';
import type { MetricAttributes } from './metric-attributes.js';
import { MetricsPort } from './metrics.port.js';

/**
 * Adaptador de `MetricsPort` sobre la API de métricas de OpenTelemetry. Crea
 * cada instrumento una sola vez. Sin SDK registrado, la API es un no-op.
 */
export class OtelMetrics extends MetricsPort {
  /** Nombre del instrumentation scope de las métricas de la plataforma. */
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
