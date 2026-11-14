import type { RoutingCache } from '../ports/routing-cache.js';
import { NullRoutingCache } from '../null-routing-cache.js';

describe('NullRoutingCache', () => {
  describe('when reading and writing', () => {
    it('reads nothing even after a write', async () => {
      const cache: RoutingCache = new NullRoutingCache();
      await expect(cache.setIfNewer('key', 'v1', 1, 1000)).resolves.toBe(false);
      await expect(cache.get('key')).resolves.toBeUndefined();
    });
  });

  describe('when deleting', () => {
    it('resolves', async () => {
      const cache: RoutingCache = new NullRoutingCache();
      await expect(cache.delete('key')).resolves.toBeUndefined();
    });
  });
});
