import { FixedClock } from '@platform/kernel/testing';
import { InMemoryRoutingCache } from './in-memory-routing-cache.js';

describe('InMemoryRoutingCache', () => {
  it('returns undefined for missing keys', async () => {
    await expect(
      new InMemoryRoutingCache().get('missing'),
    ).resolves.toBeUndefined();
  });

  it('expires values at the TTL with an injected kernel Clock', async () => {
    const clock = new FixedClock(new Date(1_000));
    const cache = new InMemoryRoutingCache(clock);
    await cache.setIfNewer('key', 'value', 1, 500);

    clock.advance(499);
    await expect(cache.get('key')).resolves.toBe('value');

    clock.advance(1);
    await expect(cache.get('key')).resolves.toBeUndefined();
  });

  it('still accepts the deprecated millisecond clock function', async () => {
    let now = 1_000;
    const cache = new InMemoryRoutingCache(() => now);
    await cache.setIfNewer('key', 'value', 1, 500);

    now = 1_499;
    await expect(cache.get('key')).resolves.toBe('value');

    now = 1_500;
    await expect(cache.get('key')).resolves.toBeUndefined();
  });

  it('writes when the key is absent', async () => {
    const cache = new InMemoryRoutingCache();
    await expect(cache.setIfNewer('key', 'v1', 1, 10_000)).resolves.toBe(true);
    await expect(cache.get('key')).resolves.toBe('v1');
  });

  it('overwrites only with a strictly higher version', async () => {
    const cache = new InMemoryRoutingCache();
    await cache.setIfNewer('key', 'v2', 2, 10_000);
    await expect(cache.setIfNewer('key', 'v1', 1, 10_000)).resolves.toBe(false);
    await expect(cache.setIfNewer('key', 'v2-again', 2, 10_000)).resolves.toBe(
      false,
    );
    await expect(cache.setIfNewer('key', 'v3', 3, 10_000)).resolves.toBe(true);
    await expect(cache.get('key')).resolves.toBe('v3');
  });

  it('treats an expired entry as absent when comparing versions', async () => {
    const clock = new FixedClock(new Date(0));
    const cache = new InMemoryRoutingCache(clock);
    await cache.setIfNewer('key', 'old', 5, 100);
    clock.advance(100);
    await expect(cache.setIfNewer('key', 'new', 1, 100)).resolves.toBe(true);
    await expect(cache.get('key')).resolves.toBe('new');
  });

  it('deletes values', async () => {
    const cache = new InMemoryRoutingCache();
    await cache.setIfNewer('key', 'value', 1, 10_000);
    await cache.delete('key');
    await expect(cache.get('key')).resolves.toBeUndefined();
  });
});
