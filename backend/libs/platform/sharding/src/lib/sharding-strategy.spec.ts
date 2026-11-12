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
