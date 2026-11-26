import type { MetricAttributes } from '../../metrics/metric-attributes.js';
import { MetricsPort } from '../../metrics/metrics.port.js';

/** Instrument kind of a measurement. */
export enum MeasurementType {
  Counter = 'counter',
  Histogram = 'histogram',
}

/** A measurement stored by `InMemoryMetrics`. */
export interface RecordedMeasurement {
  readonly type: MeasurementType;
  readonly name: string;
  readonly value: number;
  readonly attributes: MetricAttributes;
}

/** Stores measurements in memory, for tests. */
export class InMemoryMetrics extends MetricsPort {
  readonly measurements: RecordedMeasurement[] = [];

  override increment(
    name: string,
    attributes: MetricAttributes = {},
    value = 1,
  ): void {
    this.measurements.push({
      type: MeasurementType.Counter,
      name,
      value,
      attributes,
    });
  }

  override record(
    name: string,
    value: number,
    attributes: MetricAttributes = {},
  ): void {
    this.measurements.push({
      type: MeasurementType.Histogram,
      name,
      value,
      attributes,
    });
  }

  /** Sum of a counter, optionally filtered by attributes. */
  total(name: string, where: MetricAttributes = {}): number {
    return this.measurements
      .filter(
        (measurement) =>
          measurement.type === MeasurementType.Counter &&
          measurement.name === name &&
          Object.entries(where).every(
            ([key, value]) => measurement.attributes[key] === value,
          ),
      )
      .reduce((sum, measurement) => sum + measurement.value, 0);
  }
}
