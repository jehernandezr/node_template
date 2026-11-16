import type { MetricAttributes, MetricsPort } from '@platform/observability';

/** Puerto de métricas de prueba que guarda cada contador y cada medición. */
export class RecordingMetricsPort implements MetricsPort {
  readonly increments: {
    readonly name: string;
    readonly attributes?: MetricAttributes;
    readonly value?: number;
  }[] = [];
  readonly records: {
    readonly name: string;
    readonly value: number;
    readonly attributes?: MetricAttributes;
  }[] = [];

  increment(name: string, attributes?: MetricAttributes, value?: number): void {
    this.increments.push({ name, attributes, value });
  }

  record(name: string, value: number, attributes?: MetricAttributes): void {
    this.records.push({ name, value, attributes });
  }
}
