import { ConsistentHashRing } from '../consistent-hash-ring.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import {
  ConsistentHashStrategy,
  type ShardingStrategy,
} from '../sharding-strategy.js';
import { ShardStrategy } from '../model/shard-strategy.enum.js';

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

  it('keeps locating consistently after a bounded cache evicts a ring', () => {
    const groupA = ['shard-1', 'shard-2'];
    const groupB = ['shard-3', 'shard-4'];
    const bounded = new ConsistentHashStrategy({ maxRings: 1 });
    const roomy = new ConsistentHashStrategy({ maxRings: 2 });

    for (const key of keys(100)) {
      const expected = roomy.locate(key, groupA);
      bounded.locate(key, groupA);
      bounded.locate(key, groupB);
      expect(bounded.locate(key, groupA)).toBe(expected);
    }
  });

  it('rejects an invalid maxRings', () => {
    expect(() => new ConsistentHashStrategy({ maxRings: 0 })).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.InvalidConfiguration }),
    );
  });

  it('gives the same answer whatever the placement version of the tenant', () => {
    const strategy: ShardingStrategy = new ConsistentHashStrategy();
    const group = ['shard-1', 'shard-2'];
    for (const key of keys(50)) {
      expect(strategy.locate(key, [...group].reverse(), 7)).toBe(
        strategy.locate(key, group, 3),
      );
    }
  });

  it('declares its kind', () => {
    expect(new ConsistentHashStrategy().kind).toBe(
      ShardStrategy.ConsistentHash,
    );
  });

  it('builds a fresh ring when the group changes', () => {
    const strategy: ShardingStrategy = new ConsistentHashStrategy();
    expect(strategy.locate('key-1', ['shard-1', 'shard-2'], 1)).toBeDefined();

    const grown = ['shard-1', 'shard-2', 'shard-3'];
    const fresh = new ConsistentHashRing();
    grown.forEach((shard) => fresh.add(shard));
    for (const key of keys(300)) {
      expect(strategy.locate(key, grown, 2)).toBe(fresh.locate(key));
    }
  });
});
