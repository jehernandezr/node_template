import { CacheErrorReporter } from '../../cache-error-reporter.js';

/** Test reporter that stores each reported failure. */
export class RecordingCacheErrorReporter extends CacheErrorReporter {
  readonly errors: unknown[] = [];

  report(error: unknown): void {
    this.errors.push(error);
  }
}
