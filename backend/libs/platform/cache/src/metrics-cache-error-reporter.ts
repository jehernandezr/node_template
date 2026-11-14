import { CacheErrorReporter } from './cache-error-reporter.js';
import type { CacheMetrics } from './cache-metrics.js';

/** Reporta cada falla absorbida como métrica, con el nombre del caché como atributo. */
export class MetricsCacheErrorReporter extends CacheErrorReporter {
  constructor(
    private readonly metrics: CacheMetrics,
    private readonly cacheName?: string,
  ) {
    super();
  }

  report(error: unknown): void {
    this.metrics.reportError(error, this.cacheName);
  }
}
