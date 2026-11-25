import { FixedClock } from '@platform/kernel/test-utils';
import type { CachePortHarness } from './cache-port-harness.js';

/**
 * `CachePort` contract test: the in-memory double and the real
 * adapter run the same suite, so they do not diverge.
 */
export function runCachePortContract(
  name: string,
  factory: (clock: FixedClock) => Promise<CachePortHarness> | CachePortHarness,
): void {
  describe(`${name} as a CachePort`, () => {
    it('returns undefined for a missing key', async () => {
      const { cache } = await factory(new FixedClock());
      await expect(cache.get('absent')).resolves.toBeUndefined();
    });

    it('stores and returns a value', async () => {
      const { cache } = await factory(new FixedClock());
      await cache.set('key', 'value');
      await expect(cache.get('key')).resolves.toBe('value');
    });

    it('keeps a value with a TTL until the TTL elapses', async () => {
      const { cache, advance } = await factory(new FixedClock());
      await cache.set('key', 'value', 1_000);
      await advance(999);
      await expect(cache.get('key')).resolves.toBe('value');
      await advance(1);
      await expect(cache.get('key')).resolves.toBeUndefined();
    });

    it('keeps a value without a TTL for a long time', async () => {
      const { cache, advance } = await factory(new FixedClock());
      await cache.set('key', 'value');
      await advance(24 * 60 * 60 * 1_000);
      await expect(cache.get('key')).resolves.toBe('value');
    });

    it('setIfAbsent stores once and never overwrites', async () => {
      const { cache } = await factory(new FixedClock());
      await expect(cache.setIfAbsent('key', 'first')).resolves.toBe(true);
      await expect(cache.setIfAbsent('key', 'second')).resolves.toBe(false);
      await expect(cache.get('key')).resolves.toBe('first');
    });

    it('setIfAbsent stores over an expired key', async () => {
      const { cache, advance } = await factory(new FixedClock());
      await cache.set('key', 'old', 100);
      await advance(100);
      await expect(cache.setIfAbsent('key', 'new')).resolves.toBe(true);
      await expect(cache.get('key')).resolves.toBe('new');
    });

    it('delete removes the key and is idempotent', async () => {
      const { cache } = await factory(new FixedClock());
      await cache.set('key', 'value');
      await cache.delete('key');
      await expect(cache.get('key')).resolves.toBeUndefined();
      await expect(cache.delete('key')).resolves.toBeUndefined();
    });
  });
}
