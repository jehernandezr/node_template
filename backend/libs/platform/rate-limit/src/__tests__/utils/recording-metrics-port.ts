import type { MetricAttributes, MetricsPort } from '@platform/observability';

/** An increment received by {@link RecordingMetricsPort}. */
export interface RecordedIncrement {
  readonly name: string;
  readonly attributes?: MetricAttributes;
  readonly value?: number;
}

/** A measurement received by {@link RecordingMetricsPort}. */
export interface RecordedRecord {
  readonly name: string;
  readonly value: number;
  readonly attributes?: MetricAttributes;
}

/** Metrics port that only stores what it receives, for tests. */
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
