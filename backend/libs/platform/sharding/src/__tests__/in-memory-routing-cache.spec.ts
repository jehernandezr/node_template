import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryRoutingCache } from './utils/in-memory-routing-cache.js';
import { runRoutingCacheContract } from './utils/index.js';

runRoutingCacheContract('InMemoryRoutingCache', async () => {
  const clock = new FixedClock();
  return {
    cache: new InMemoryRoutingCache(clock),
    advance: async (ms: number) => clock.advance(ms),
  };
});

describe('InMemoryRoutingCache', () => {
  describe('when the system clock is used by default', () => {
    it('returns undefined for a missing key', async () => {
      await expect(
        new InMemoryRoutingCache().get('missing'),
      ).resolves.toBeUndefined();
    });
  });

  describe('when a stored version is compared with an expired one', () => {
    it('treats an expired entry as absent', async () => {
      const clock = new FixedClock(new Date(0));
      const cache = new InMemoryRoutingCache(clock);
      await cache.setIfNewer('key', 'old', 5, 100);
      clock.advance(100);
      await expect(cache.setIfNewer('key', 'new', 1, 100)).resolves.toBe(true);
      await expect(cache.get('key')).resolves.toBe('new');
    });
  });

  describe('when the ttl is reached', () => {
    it('expires values exactly at the ttl', async () => {
      const clock = new FixedClock(new Date(1_000));
      const cache = new InMemoryRoutingCache(clock);
      await cache.setIfNewer('key', 'value', 1, 500);
      clock.advance(499);
      await expect(cache.get('key')).resolves.toBe('value');
      clock.advance(1);
      await expect(cache.get('key')).resolves.toBeUndefined();
    });
  });
});
