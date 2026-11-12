import { InMemoryCache } from './in-memory-cache.js';

describe('InMemoryCache', () => {
  it('stores, reads and deletes values', async () => {
    const cache = new InMemoryCache();
    await cache.set('a', 'one', 1000);
    expect(await cache.get('a')).toBe('one');
    await cache.delete('a');
    expect(await cache.get('a')).toBeUndefined();
  });

  it('expires entries when the fake clock reaches the TTL', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    await cache.set('a', 'v', 1000);

    now = 999;
    expect(await cache.get('a')).toBe('v');

    now = 1000;
    expect(await cache.get('a')).toBeUndefined();
  });

  it('keeps entries stored without a TTL forever', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    await cache.set('a', 'v');

    now = Number.MAX_SAFE_INTEGER / 2;
    expect(await cache.get('a')).toBe('v');
  });

  it('setIfAbsent stores only missing or expired keys', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    expect(await cache.setIfAbsent('k', 'first')).toBe(true);
    expect(await cache.setIfAbsent('k', 'second')).toBe(false);
    expect(await cache.get('k')).toBe('first');

    await cache.set('t', 'old', 10);
    now = 10;
    expect(await cache.setIfAbsent('t', 'new')).toBe(true);
    expect(await cache.get('t')).toBe('new');
  });

  it('creates counters at 0 and increments them without a TTL', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    expect(await cache.incr('c')).toBe(1);
    expect(await cache.incr('c')).toBe(2);

    now = Number.MAX_SAFE_INTEGER / 2;
    expect(await cache.get('c')).toBe('2');
  });

  it('keeps the existing TTL when incrementing a live key', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    await cache.set('c', '5', 100);
    expect(await cache.incr('c')).toBe(6);

    now = 100;
    expect(await cache.get('c')).toBeUndefined();
  });

  it('rejects incrementing a non-integer value', async () => {
    const cache = new InMemoryCache();
    await cache.set('s', 'text', 1000);
    await expect(cache.incr('s')).rejects.toThrow(TypeError);
  });
});
