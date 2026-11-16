import { ErrorMetrics } from '../error-metrics.js';
import { MetricAttribute } from '../metric-attribute.enum.js';
import { PlatformMetric } from '../platform-metric.enum.js';
import { InMemoryMetrics } from '../../__tests__/utils/in-memory-metrics.js';
import { DependencyTimeoutError } from './utils/dependency-timeout.error.js';

describe('ErrorMetrics', () => {
  it('counts a recorded error by its code', () => {
    const port = new InMemoryMetrics();

    new ErrorMetrics(port).record(new DependencyTimeoutError('slow'));

    expect(
      port.total(PlatformMetric.Errors, {
        [MetricAttribute.ErrorCode]: 'PLATFORM.CACHE.TIMEOUT',
      }),
    ).toBe(1);
  });
});
