import { FixedClock } from '@platform/kernel/test-utils';
import { ExpiringLru } from '../expiring-lru.js';

const START = new Date(1_000);

describe('ExpiringLru', () => {
  let clock: FixedClock;
  let cache: ExpiringLru<string>;

  beforeEach(() => {
    clock = new FixedClock(START);
    cache = new ExpiringLru<string>(2, clock);
  });

  describe('when an entry has not expired', () => {
    it('returns the value before its expiration instant', () => {
      cache.set('key', 'value', START.getTime() + 500);
      clock.advance(499);
      expect(cache.get('key')).toBe('value');
    });
  });

  describe('when an entry reaches its expiration', () => {
    it('returns undefined at the exact expiration instant and removes it', () => {
      cache.set('key', 'value', START.getTime() + 500);
      clock.advance(500);
      expect(cache.get('key')).toBeUndefined();
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('when the capacity is exceeded', () => {
    it('evicts the least recently written entry', () => {
      const later = START.getTime() + 10_000;
      cache.set('a', 'a', later);
      cache.set('b', 'b', later);
      cache.set('c', 'c', later);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('b');
      expect(cache.get('c')).toBe('c');
    });
  });

  describe('when an entry is deleted', () => {
    it('no longer returns it', () => {
      cache.set('key', 'value', START.getTime() + 10_000);
      cache.delete('key');
      expect(cache.get('key')).toBeUndefined();
    });
  });
});
