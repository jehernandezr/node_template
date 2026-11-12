import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingErrorCode } from './errors.js';
import { ConsistentHashStrategy } from './sharding-strategy.js';

const keys = (count: number) =>
  Array.from({ length: count }, (_, i) => `key-${i}`);

describe('ConsistentHashStrategy', () => {
  it('returns a member of the group', () => {
    const strategy = new ConsistentHashStrategy();
    const group = ['shard-1', 'shard-2', 'shard-3'];
    for (const key of keys(200)) {
      expect(group).toContain(strategy.locate(key, group));
    }
  });

  it('is independent of the order of the group', () => {
    const strategy = new ConsistentHashStrategy();
    for (const key of keys(200)) {
      expect(strategy.locate(key, ['shard-3', 'shard-1', 'shard-2'])).toBe(
        strategy.locate(key, ['shard-1', 'shard-2', 'shard-3']),
      );
    }
  });

  it('throws UnknownShard for an empty group', () => {
    expect(() => new ConsistentHashStrategy().locate('key', [])).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
    );
  });

  it('keeps at most maxRings memoized rings', () => {
    const add = jest.spyOn(ConsistentHashRing.prototype, 'add');
    const groupA = ['shard-1', 'shard-2'];
    const groupB = ['shard-3', 'shard-4'];

    const bounded = new ConsistentHashStrategy({ maxRings: 1 });
    bounded.locate('key', groupA);
    bounded.locate('key', groupB);
    bounded.locate('key', groupA); // A was evicted by B: rebuilt
    expect(add).toHaveBeenCalledTimes(6);

    add.mockClear();
    const roomy = new ConsistentHashStrategy({ maxRings: 2 });
    roomy.locate('key', groupA);
    roomy.locate('key', groupB);
    roomy.locate('key', groupA);
    expect(add).toHaveBeenCalledTimes(4);
    add.mockRestore();
  });

  it('rejects an invalid maxRings', () => {
    expect(() => new ConsistentHashStrategy({ maxRings: 0 })).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.InvalidConfiguration }),
    );
  });

  it('rebuilds the ring when the placement version changes', () => {
    const strategy = new ConsistentHashStrategy();
    expect(strategy.locate('key-1', ['shard-1', 'shard-2'], 1)).toBeDefined();

    const grown = ['shard-1', 'shard-2', 'shard-3'];
    const fresh = new ConsistentHashRing();
    grown.forEach((shard) => fresh.add(shard));
    for (const key of keys(300)) {
      expect(strategy.locate(key, grown, 2)).toBe(fresh.locate(key));
    }
  });
});
