import { CacheInvalidArgumentError } from '../errors/cache-invalid-argument.error.js';
import { CacheLookupResult } from '../cache-lookup-result.enum.js';
import { CacheMetrics } from '../cache-metrics.js';
import { RecordingMetricsPort } from './utils/recording-metrics-port.js';

describe('CacheMetrics', () => {
  it('counts a coded error with its name, code and cache', () => {
    const port = new RecordingMetricsPort();
    new CacheMetrics(port).reportError(
      new CacheInvalidArgumentError('ttlMs', 'a number'),
      'orders',
    );

    expect(port.increments).toEqual([
      {
        name: 'platform.cache.errors',
        attributes: {
          'error.name': 'CacheInvalidArgumentError',
          'error.code': 'PLATFORM.CACHE.INVALID_ARGUMENT',
          cache: 'orders',
        },
        value: undefined,
      },
    ]);
  });

  it('leaves out the code and the cache when the error has neither', () => {
    const port = new RecordingMetricsPort();
    new CacheMetrics(port).reportError(new Error('plain'));

    expect(port.increments[0].attributes).toEqual({ 'error.name': 'Error' });
  });

  it.each([
    [CacheLookupResult.Hit, 'orders', { result: 'hit', cache: 'orders' }],
    [CacheLookupResult.Miss, undefined, { result: 'miss' }],
  ])('counts a %p lookup', (result, cacheName, attributes) => {
    const port = new RecordingMetricsPort();
    new CacheMetrics(port).recordLookup(result, cacheName);

    expect(port.increments).toEqual([
      { name: 'platform.cache.lookups', attributes, value: undefined },
    ]);
  });
});
