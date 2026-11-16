import type { MetricAttributes, MetricsPort } from '@platform/observability';

/** Un incremento recibido por {@link RecordingMetricsPort}. */
export interface RecordedIncrement {
  readonly name: string;
  readonly attributes?: MetricAttributes;
  readonly value?: number;
}

/** Una medición recibida por {@link RecordingMetricsPort}. */
export interface RecordedRecord {
  readonly name: string;
  readonly value: number;
  readonly attributes?: MetricAttributes;
}

/** Puerto de métricas que solo guarda lo recibido, para pruebas. */
export class RecordingMetricsPort implements MetricsPort {
  readonly increments: RecordedIncrement[] = [];
  readonly records: RecordedRecord[] = [];

  increment(name: string, attributes?: MetricAttributes, value?: number): void {
    this.increments.push({ name, attributes, value });
  }

  record(name: string, value: number, attributes?: MetricAttributes): void {
    this.records.push({ name, value, attributes });
  }
}
