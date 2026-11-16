import { CacheMetrics } from '../cache-metrics.js';
import { MetricsCacheErrorReporter } from '../metrics-cache-error-reporter.js';
import { RecordingMetricsPort } from './utils/recording-metrics-port.js';

describe('MetricsCacheErrorReporter', () => {
  it('counts each reported failure under the cache name', () => {
    const port = new RecordingMetricsPort();
    const reporter = new MetricsCacheErrorReporter(
      new CacheMetrics(port),
      'orders',
    );

    reporter.report(new Error('down'));

    expect(port.increments).toEqual([
      {
        name: 'platform.cache.errors',
        attributes: { 'error.name': 'Error', cache: 'orders' },
        value: undefined,
      },
    ]);
  });
});
