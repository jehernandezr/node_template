import { FixedClock } from '@platform/kernel/test-utils';
import { runCachePortContract } from './utils/index.js';
import { InMemoryCache } from '../in-memory-cache.js';

runCachePortContract('InMemoryCache', (clock) => ({
  cache: new InMemoryCache({ clock }),
  advance: async (ms: number): Promise<void> => {
    clock.advance(ms);
  },
}));

describe('InMemoryCache', () => {
  it('reads the system clock when no clock is given', async () => {
    const cache = new InMemoryCache();
    await cache.set('key', 'value', 60_000);
    await expect(cache.get('key')).resolves.toBe('value');
  });

  it('expires an entry set with a TTL on the injected clock', async () => {
    const clock = new FixedClock();
    const cache = new InMemoryCache({ clock });
    await cache.set('key', 'value', 10);
    clock.advance(10);
    await expect(cache.setIfAbsent('key', 'next')).resolves.toBe(true);
  });
});
