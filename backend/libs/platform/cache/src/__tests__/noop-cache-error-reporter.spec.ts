import type { CacheErrorReporter } from '../cache-error-reporter.js';
import { NoopCacheErrorReporter } from '../noop-cache-error-reporter.js';

describe('NoopCacheErrorReporter', () => {
  it('accepts any failure without effect', () => {
    const reporter: CacheErrorReporter = new NoopCacheErrorReporter();
    expect(() => reporter.report(new Error('ignored'))).not.toThrow();
    expect(() => reporter.report('plain value')).not.toThrow();
  });
});
