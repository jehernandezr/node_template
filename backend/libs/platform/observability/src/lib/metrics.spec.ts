import {
  MeterProvider,
  MetricReader,
  type CollectionResult,
} from '@opentelemetry/sdk-metrics';
import { PlatformError } from '@platform/kernel';
import {
  cacheErrorMetricsReporter,
  CacheLookupResult,
  errorMetricAttributes,
  InMemoryMetrics,
  MetricAttribute,
  NoopMetrics,
  OtelMetrics,
  PlatformMetric,
  recordCacheLookup,
  recordError,
  resilienceMetricsListener,
} from './metrics.js';

class CacheTimeoutError extends PlatformError {
  readonly code = 'PLATFORM.CACHE.TIMEOUT';
}

class TestReader extends MetricReader {
  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

function sumOf(result: CollectionResult, name: string): number {
  let total = 0;
  for (const scope of result.resourceMetrics.scopeMetrics) {
    for (const metric of scope.metrics) {
      if (metric.descriptor.name !== name) continue;
      for (const point of metric.dataPoints) {
        total += point.value as number;
      }
    }
  }
  return total;
}

describe('resilienceMetricsListener', () => {
  it('counts each event by policy, dependency, kind and error code', () => {
    const metrics = new InMemoryMetrics();
    const listener = resilienceMetricsListener(metrics);

    listener({
      policy: 'database',
      dependencyKey: 'orders-db',
      kind: 'retry',
      detail: { attempt: 1, delayMs: 120, errorCode: 'ECONNRESET' },
    });
    listener({ policy: 'database', dependencyKey: 'orders-db', kind: 'break' });

    expect(
      metrics.total(PlatformMetric.ResilienceEvents, {
        [MetricAttribute.Kind]: 'retry',
        [MetricAttribute.ErrorCode]: 'ECONNRESET',
      }),
    ).toBe(1);
    expect(
      metrics.total(PlatformMetric.ResilienceEvents, {
        [MetricAttribute.Dependency]: 'orders-db',
      }),
    ).toBe(2);
    expect(metrics.measurements).toContainEqual(
      expect.objectContaining({
        name: PlatformMetric.ResilienceRetryDelay,
        value: 120,
      }),
    );
  });
});

describe('cache metrics', () => {
  it('counts absorbed cache errors by code and cache name', () => {
    const metrics = new InMemoryMetrics();
    const onError = cacheErrorMetricsReporter(metrics, 'orders');

    onError(new CacheTimeoutError('slow'));
    onError(new TypeError('boom'));

    expect(
      metrics.total(PlatformMetric.CacheErrors, {
        [MetricAttribute.ErrorCode]: 'PLATFORM.CACHE.TIMEOUT',
        [MetricAttribute.Cache]: 'orders',
      }),
    ).toBe(1);
    expect(
      metrics.total(PlatformMetric.CacheErrors, {
        [MetricAttribute.ErrorName]: 'TypeError',
      }),
    ).toBe(1);
  });

  it('counts lookups by result', () => {
    const metrics = new InMemoryMetrics();

    recordCacheLookup(metrics, CacheLookupResult.Hit);
    recordCacheLookup(metrics, CacheLookupResult.Miss, 'orders');

    expect(
      metrics.total(PlatformMetric.CacheLookups, {
        [MetricAttribute.Result]: 'hit',
      }),
    ).toBe(1);
  });
});

describe('errorMetricAttributes', () => {
  it('uses code and name, never the message', () => {
    const attributes = errorMetricAttributes(
      new CacheTimeoutError('user ana@example.com'),
    );
    expect(attributes).toEqual({
      [MetricAttribute.ErrorCode]: 'PLATFORM.CACHE.TIMEOUT',
      [MetricAttribute.ErrorName]: 'CacheTimeoutError',
    });
    expect(JSON.stringify(attributes)).not.toContain('ana@');
  });

  it('handles non-object errors', () => {
    expect(errorMetricAttributes('x')).toEqual({
      [MetricAttribute.ErrorName]: 'string',
    });
  });

  it('recordError counts by code', () => {
    const metrics = new InMemoryMetrics();
    recordError(metrics, new CacheTimeoutError('x'));
    expect(
      metrics.total(PlatformMetric.Errors, {
        [MetricAttribute.ErrorCode]: 'PLATFORM.CACHE.TIMEOUT',
      }),
    ).toBe(1);
  });
});

describe('OtelMetrics', () => {
  it('publishes counters and histograms through an OpenTelemetry meter', async () => {
    const reader = new TestReader();
    const provider = new MeterProvider({ readers: [reader] });
    const metrics = new OtelMetrics(provider.getMeter('test'));

    metrics.increment(PlatformMetric.ResilienceEvents, { kind: 'retry' });
    metrics.increment(PlatformMetric.ResilienceEvents, { kind: 'retry' }, 2);
    metrics.record(PlatformMetric.ResilienceRetryDelay, 50);

    const result = await reader.collect();
    expect(sumOf(result, PlatformMetric.ResilienceEvents)).toBe(3);
    const names = result.resourceMetrics.scopeMetrics
      .flatMap((scope) => scope.metrics)
      .map((metric) => metric.descriptor.name);
    expect(names).toContain(PlatformMetric.ResilienceRetryDelay);
    await provider.shutdown();
  });

  it('NoopMetrics accepts calls without effect', () => {
    const metrics = new NoopMetrics();
    expect(() => {
      metrics.increment();
      metrics.record();
    }).not.toThrow();
  });
});
