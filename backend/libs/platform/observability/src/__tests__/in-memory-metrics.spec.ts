import { PlatformMetric } from '../metrics/platform-metric.enum.js';
import { InMemoryMetrics, MeasurementType } from './utils/in-memory-metrics.js';

describe('InMemoryMetrics', () => {
  it('sums counter increments, with the default value of 1', () => {
    const metrics = new InMemoryMetrics();

    metrics.increment(PlatformMetric.Errors);
    metrics.increment(PlatformMetric.Errors, {}, 4);

    expect(metrics.total(PlatformMetric.Errors)).toBe(5);
  });

  it('filters the total by attributes', () => {
    const metrics = new InMemoryMetrics();

    metrics.increment(PlatformMetric.Errors, {
      'error.code': 'PLATFORM.CACHE.TIMEOUT',
    });
    metrics.increment(PlatformMetric.Errors, {
      'error.code': 'PLATFORM.CACHE.TIMEOUT',
    });
    metrics.increment(PlatformMetric.Errors, {
      'error.code': 'PLATFORM.AUTH.FORBIDDEN',
    });

    expect(
      metrics.total(PlatformMetric.Errors, {
        'error.code': 'PLATFORM.CACHE.TIMEOUT',
      }),
    ).toBe(2);
  });

  it('does not count histograms in the total', () => {
    const metrics = new InMemoryMetrics();

    metrics.record(PlatformMetric.Errors, 250);
    metrics.increment(PlatformMetric.Errors);

    expect(metrics.total(PlatformMetric.Errors)).toBe(1);
  });

  it('keeps each measurement with its type, name, value and attributes', () => {
    const metrics = new InMemoryMetrics();

    metrics.increment('orders.created', { region: 'mx' });
    metrics.record('orders.latency', 42, { region: 'mx' });

    expect(metrics.measurements).toEqual([
      {
        type: MeasurementType.Counter,
        name: 'orders.created',
        value: 1,
        attributes: { region: 'mx' },
      },
      {
        type: MeasurementType.Histogram,
        name: 'orders.latency',
        value: 42,
        attributes: { region: 'mx' },
      },
    ]);
  });
});
