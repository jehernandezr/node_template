import { CacheErrorReporter } from './cache-error-reporter.js';

/** Descarta las fallas absorbidas. */
export class NoopCacheErrorReporter extends CacheErrorReporter {
  report(): void {
    return undefined;
  }
}
