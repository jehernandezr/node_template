import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryCache } from '../in-memory-cache.js';

describe('InMemoryCache', () => {
  it('stores, reads and deletes values', async () => {
    const cache = new InMemoryCache();
    await cache.set('a', 'one', 1000);
    expect(await cache.get('a')).toBe('one');
    await cache.delete('a');
    expect(await cache.get('a')).toBeUndefined();
  });

  it('expires entries when the fake clock reaches the TTL', async () => {
    const clock = new FixedClock(new Date(0));
    const cache = new InMemoryCache({ clock });
    await cache.set('a', 'v', 1000);

    clock.set(new Date(999));
    expect(await cache.get('a')).toBe('v');

    clock.set(new Date(1000));
    expect(await cache.get('a')).toBeUndefined();
  });

  it('keeps entries stored without a TTL forever', async () => {
    const clock = new FixedClock(new Date(0));
    const cache = new InMemoryCache({ clock });
    await cache.set('a', 'v');

    clock.set(new Date(Number.MAX_SAFE_INTEGER / 2));
    expect(await cache.get('a')).toBe('v');
  });

  it('setIfAbsent stores only missing or expired keys', async () => {
    const clock = new FixedClock(new Date(0));
    const cache = new InMemoryCache({ clock });
    expect(await cache.setIfAbsent('k', 'first')).toBe(true);
    expect(await cache.setIfAbsent('k', 'second')).toBe(false);
    expect(await cache.get('k')).toBe('first');

    await cache.set('t', 'old', 10);
    clock.set(new Date(10));
    expect(await cache.setIfAbsent('t', 'new')).toBe(true);
    expect(await cache.get('t')).toBe('new');
  });

  it('reads time from a kernel Clock', async () => {
    const clock = new FixedClock();
    const cache = new InMemoryCache({ clock });
    await cache.set('a', 'v', 1000);

    clock.advance(999);
    expect(await cache.get('a')).toBe('v');

    clock.advance(1);
    expect(await cache.get('a')).toBeUndefined();
  });
});
