import { ErrorDescriptor } from '@platform/kernel';
import type { MetricsPort } from '@platform/observability';
import type { CacheLookupResult } from './cache-lookup-result.enum.js';
import { CacheMetricAttribute } from './cache-metric-attribute.enum.js';
import { CacheMetricName } from './cache-metric-name.enum.js';

/** Publica las métricas de `@platform/cache` por el puerto de métricas. */
export class CacheMetrics {
  constructor(private readonly metrics: MetricsPort) {}

  /** Cuenta una falla absorbida, con su nombre y su código si los tiene. */
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

  /** Cuenta una lectura por resultado (`hit` o `miss`). */
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
