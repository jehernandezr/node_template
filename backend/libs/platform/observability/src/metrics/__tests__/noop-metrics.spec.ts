import type { MetricsPort } from '../metrics.port.js';
import { NoopMetrics } from '../noop-metrics.js';

describe('NoopMetrics', () => {
  it('accepts every call without effect', () => {
    const metrics: MetricsPort = new NoopMetrics();

    expect(() => {
      metrics.increment('orders.created', { region: 'mx' }, 3);
      metrics.record('orders.latency', 12.5);
    }).not.toThrow();
  });
});
