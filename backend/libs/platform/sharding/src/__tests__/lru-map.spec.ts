import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { LruMap } from '../lru-map.js';

describe('LruMap', () => {
  it('evicts the least recently written entry past the limit', () => {
    const evicted: string[] = [];
    const map = new LruMap<string, number>(2, (key) => evicted.push(key));
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    expect(map.size).toBe(2);
    expect(map.peek('a')).toBeUndefined();
    expect(evicted).toEqual(['a']);
  });

  it('treats get as a use and peek as not', () => {
    const map = new LruMap<string, number>(2);
    map.set('a', 1);
    map.set('b', 2);
    expect(map.get('a')).toBe(1);
    map.set('c', 3);
    expect(map.peek('a')).toBe(1);
    expect(map.peek('b')).toBeUndefined();

    expect(map.peek('a')).toBe(1);
    map.set('d', 4);
    expect(map.peek('a')).toBeUndefined();
  });

  it('overwrites without growing and deletes', () => {
    const map = new LruMap<string, number>(2);
    map.set('a', 1);
    map.set('a', 2);
    expect(map.size).toBe(1);
    expect(map.get('a')).toBe(2);
    expect(map.delete('a')).toBe(true);
    expect(map.get('a')).toBeUndefined();
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects a capacity of %s',
    (maxEntries) => {
      expect(() => new LruMap(maxEntries)).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    },
  );
});
