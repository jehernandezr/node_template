import { RangeShardStrategy } from './range-shard-strategy.js';

const GROUP = ['shard-1', 'shard-2', 'shard-3'];

describe('RangeShardStrategy', () => {
  it('routes keys to the first boundary whose upTo is not smaller than the key', () => {
    const strategy = new RangeShardStrategy(
      [
        { upTo: 'f', shard: 'shard-1' },
        { upTo: 'm', shard: 'shard-2' },
      ],
      'shard-3',
    );
    expect(strategy.locate('a', GROUP)).toBe('shard-1');
    expect(strategy.locate('f', GROUP)).toBe('shard-1');
    expect(strategy.locate('g', GROUP)).toBe('shard-2');
    expect(strategy.locate('m', GROUP)).toBe('shard-2');
    expect(strategy.locate('n', GROUP)).toBe('shard-3');
    expect(strategy.locate('zzz', GROUP)).toBe('shard-3');
  });

  it('sorts boundaries given in any order', () => {
    const strategy = new RangeShardStrategy(
      [
        { upTo: 'm', shard: 'shard-2' },
        { upTo: 'f', shard: 'shard-1' },
      ],
      'shard-3',
    );
    expect(strategy.locate('c', GROUP)).toBe('shard-1');
    expect(strategy.locate('h', GROUP)).toBe('shard-2');
  });

  it('sends every key to the last shard when there are no boundaries', () => {
    expect(
      new RangeShardStrategy([], 'shard-3').locate('anything', GROUP),
    ).toBe('shard-3');
  });

  it('compares numeric keys numerically when given a numeric comparator', () => {
    const numeric = (a: string, b: string) => Number(a) - Number(b);
    const strategy = new RangeShardStrategy(
      [
        { upTo: '10', shard: 'shard-2' },
        { upTo: '9', shard: 'shard-1' },
      ],
      'shard-3',
      numeric,
    );
    expect(strategy.locate('2', GROUP)).toBe('shard-1');
    expect(strategy.locate('9', GROUP)).toBe('shard-1');
    expect(strategy.locate('10', GROUP)).toBe('shard-2');
    expect(strategy.locate('11', GROUP)).toBe('shard-3');
  });

  it('compares with code units by default, so the boundary "10" sorts before "9"', () => {
    const strategy = new RangeShardStrategy(
      [
        { upTo: '9', shard: 'shard-1' },
        { upTo: '10', shard: 'shard-2' },
      ],
      'shard-3',
    );
    expect(strategy.locate('2', GROUP)).toBe('shard-1');
    expect(strategy.locate('10', GROUP)).toBe('shard-2');
  });

  it('treats numerically equal boundaries as duplicates under a numeric comparator', () => {
    const numeric = (a: string, b: string) => Number(a) - Number(b);
    expect(
      () =>
        new RangeShardStrategy(
          [
            { upTo: '9', shard: 'shard-1' },
            { upTo: '09', shard: 'shard-2' },
          ],
          'shard-3',
          numeric,
        ),
    ).toThrow('Duplicate range boundary');
  });

  it('rejects duplicate boundaries', () => {
    expect(
      () =>
        new RangeShardStrategy(
          [
            { upTo: 'f', shard: 'shard-1' },
            { upTo: 'f', shard: 'shard-2' },
          ],
          'shard-3',
        ),
    ).toThrow('Duplicate range boundary "f"');
  });

  it('rejects empty shard ids', () => {
    expect(() => new RangeShardStrategy([], '')).toThrow();
    expect(
      () => new RangeShardStrategy([{ upTo: 'f', shard: '' }], 'shard-3'),
    ).toThrow();
  });

  it('throws UnknownShard when the range shard is not in the tenant group', () => {
    const strategy = new RangeShardStrategy([], 'shard-9');
    expect(() => strategy.locate('key', GROUP)).toThrow(
      expect.objectContaining({ code: 'PLATFORM.SHARDING.UNKNOWN_SHARD' }),
    );
  });
});
