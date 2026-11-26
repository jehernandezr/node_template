import { CacheErrorReporter } from './cache-error-reporter.js';

/** Discards the absorbed failures. */
export class NoopCacheErrorReporter extends CacheErrorReporter {
  /** Ignores the failure. */
  override report(): void {
    return undefined;
  }
}
