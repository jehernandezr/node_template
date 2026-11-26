import { CacheErrorReporter } from './cache-error-reporter.js';
import type { CacheMetrics } from './cache-metrics.js';

/** Reports each absorbed failure as a metric, with the cache name as an attribute. */
export class MetricsCacheErrorReporter extends CacheErrorReporter {
  constructor(
    private readonly metrics: CacheMetrics,
    private readonly cacheName?: string,
  ) {
    super();
  }

  override report(error: unknown): void {
    this.metrics.reportError(error, this.cacheName);
  }
}
