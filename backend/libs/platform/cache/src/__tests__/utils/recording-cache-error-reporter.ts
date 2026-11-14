import { CacheErrorReporter } from '../../cache-error-reporter.js';

/** Reporter de prueba que guarda cada falla reportada. */
export class RecordingCacheErrorReporter extends CacheErrorReporter {
  readonly errors: unknown[] = [];

  report(error: unknown): void {
    this.errors.push(error);
  }
}
