import type { MetricAttributes, MetricsPort } from '@platform/observability';

export interface RecordedIncrement {
  readonly name: string;
  readonly attributes: MetricAttributes;
  readonly value: number;
}

export interface RecordedMeasurement {
  readonly name: string;
  readonly value: number;
  readonly attributes: MetricAttributes;
}

/** In-memory metrics with a sum per name and attributes for the tests. */
export class RecordingMetrics implements MetricsPort {
  readonly increments: RecordedIncrement[] = [];
  readonly records: RecordedMeasurement[] = [];

  increment(name: string, attributes: MetricAttributes = {}, value = 1): void {
    this.increments.push({ name, attributes, value });
  }

  record(name: string, value: number, attributes: MetricAttributes = {}): void {
    this.records.push({ name, value, attributes });
  }

  /** Sum of the increments with that name whose attributes include all the pairs of `where`. */
  total(name: string, where: MetricAttributes = {}): number {
    return this.increments
      .filter(
        (increment) =>
          increment.name === name &&
          Object.entries(where).every(
            ([key, value]) => increment.attributes[key] === value,
          ),
      )
      .reduce((sum, increment) => sum + increment.value, 0);
  }
}
