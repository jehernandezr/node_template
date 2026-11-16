import { TtlLruCache } from '../ttl-lru-cache.js';

describe('TtlLruCache', () => {
  describe('storage', () => {
    it('returns the stored value with the instant it was stored', () => {
      const cache = new TtlLruCache<string>(10);

      cache.set('a', 'value', 1_000);

      expect(cache.get('a')).toEqual({ value: 'value', storedAtMs: 1_000 });
    });

    it('returns undefined for a key that was never stored', () => {
      const cache = new TtlLruCache<string>(10);

      expect(cache.get('missing')).toBeUndefined();
    });

    it('keeps a stored undefined value distinct from an absent key', () => {
      const cache = new TtlLruCache<string | undefined>(10);

      cache.set('a', undefined, 0);

      expect(cache.get('a')).not.toBeUndefined();
      expect(cache.get('a')?.value).toBeUndefined();
    });
  });

  describe('eviction', () => {
    it('evicts the oldest entry when a third one exceeds maxEntries', () => {
      const cache = new TtlLruCache<string>(2);

      cache.set('first', '1', 0);
      cache.set('second', '2', 0);
      cache.set('third', '3', 0);

      expect(cache.get('first')).toBeUndefined();
      expect(cache.get('second')).toBeDefined();
      expect(cache.get('third')).toBeDefined();
    });

    it('keeps an entry that was read before the next insertion', () => {
      const cache = new TtlLruCache<string>(2);
      cache.set('first', '1', 0);
      cache.set('second', '2', 0);

      cache.get('first');
      cache.set('third', '3', 0);

      expect(cache.get('first')).toBeDefined();
      expect(cache.get('second')).toBeUndefined();
    });
  });

  describe('freshness', () => {
    const entry = { value: 'value', storedAtMs: 1_000 };

    it.each([
      [4_999, true],
      [5_000, false],
    ])(
      'is fresh %p ms after storing for a 5000 ms ttl: %p',
      (elapsedMs, fresh) => {
        expect(
          new TtlLruCache<string>(10).isFresh(entry, 1_000 + elapsedMs, 5_000),
        ).toBe(fresh);
      },
    );
  });
});
