import { MeterProvider, type MetricData } from '@opentelemetry/sdk-metrics';
import { TestMetricReader } from '../../__tests__/utils/test-metric-reader.js';
import { OtelMetrics } from '../otel-metrics.js';
import { PlatformMetric } from '../platform-metric.enum.js';

const LATENCY = 'platform.test.latency';

/** `OtelMetrics` sobre un SDK real cuyo lector devuelve lo registrado en memoria. */
function setup(): {
  metrics: OtelMetrics;
  collect: () => Promise<MetricData[]>;
} {
  const reader = new TestMetricReader();
  const provider = new MeterProvider({ readers: [reader] });
  return {
    metrics: new OtelMetrics(provider.getMeter('test')),
    collect: async () =>
      (await reader.collect()).resourceMetrics.scopeMetrics.flatMap(
        (scope) => scope.metrics,
      ),
  };
}

describe('OtelMetrics', () => {
  it('adds every increment of a counter under the same instrument', async () => {
    const { metrics, collect } = setup();

    metrics.increment(PlatformMetric.Errors, { kind: 'retry' });
    metrics.increment(PlatformMetric.Errors, { kind: 'retry' }, 2);

    const collected = await collect();
    expect(collected).toHaveLength(1);
    expect(collected[0]?.descriptor.name).toBe(PlatformMetric.Errors);
    expect(collected[0]?.dataPoints).toEqual([
      expect.objectContaining({ value: 3, attributes: { kind: 'retry' } }),
    ]);
  });

  it('defaults the attributes of a counter to none', async () => {
    const { metrics, collect } = setup();

    metrics.increment(PlatformMetric.Errors);

    const [metric] = await collect();
    expect(metric?.dataPoints).toEqual([
      expect.objectContaining({ value: 1, attributes: {} }),
    ]);
  });

  it('records every measurement of a histogram under the same instrument', async () => {
    const { metrics, collect } = setup();

    metrics.record(LATENCY, 50, { policy: 'payments' });
    metrics.record(LATENCY, 70);

    const collected = await collect();
    expect(collected).toHaveLength(1);
    expect(collected[0]?.descriptor.name).toBe(LATENCY);
    expect(collected[0]?.dataPoints).toEqual([
      expect.objectContaining({
        attributes: { policy: 'payments' },
        value: expect.objectContaining({ count: 1, sum: 50 }),
      }),
      expect.objectContaining({
        attributes: {},
        value: expect.objectContaining({ count: 1, sum: 70 }),
      }),
    ]);
  });

  it('uses the platform scope when no meter is given', () => {
    expect(OtelMetrics.SCOPE).toBe('@platform/observability');
    expect(() =>
      new OtelMetrics().increment(PlatformMetric.Errors),
    ).not.toThrow();
  });
});
