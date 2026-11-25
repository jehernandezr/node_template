import { ErrorDescriptor } from '@platform/kernel';
import type { MetricsPort } from '@platform/observability';
import type { CacheLookupResult } from './cache-lookup-result.enum.js';
import { CacheMetricAttribute } from './cache-metric-attribute.enum.js';
import { CacheMetricName } from './cache-metric-name.enum.js';

/** Publishes the `@platform/cache` metrics through the metrics port. */
export class CacheMetrics {
  constructor(private readonly metrics: MetricsPort) {}

  /** Counts an absorbed failure, with its name and its code if it has them. */
  reportError(error: unknown, cacheName?: string): void {
    const described = ErrorDescriptor.describe(error);
    const attributes: Record<string, string> = {
      [CacheMetricAttribute.ErrorName]: described.name,
    };
    if (described.code !== undefined) {
      attributes[CacheMetricAttribute.ErrorCode] = described.code;
    }
    if (cacheName !== undefined) {
      attributes[CacheMetricAttribute.Cache] = cacheName;
    }
    this.metrics.increment(CacheMetricName.Errors, attributes);
  }

  /** Counts a read by result (`hit` or `miss`). */
  recordLookup(result: CacheLookupResult, cacheName?: string): void {
    const attributes: Record<string, string> = {
      [CacheMetricAttribute.Result]: result,
    };
    if (cacheName !== undefined) {
      attributes[CacheMetricAttribute.Cache] = cacheName;
    }
    this.metrics.increment(CacheMetricName.Lookups, attributes);
  }
}
