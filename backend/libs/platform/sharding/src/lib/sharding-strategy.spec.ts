import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingErrorCode } from './errors.js';
import {
  ConsistentHashStrategy,
  type ShardingStrategy,
} from './sharding-strategy.js';
import { ShardStrategy } from './types.js';

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

  // Audit PLAT-11: two tenants of one group with different versions rebuilt the ring on every call.
  it('builds one ring per group, whatever the placement versions of its tenants', () => {
    const add = jest.spyOn(ConsistentHashRing.prototype, 'add');
    const strategy: ShardingStrategy = new ConsistentHashStrategy();
    const group = ['shard-1', 'shard-2'];
    for (let i = 0; i < 50; i += 1) {
      strategy.locate(`key-${i}`, group, 3);
      strategy.locate(`key-${i}`, [...group].reverse(), 7);
    }
    expect(add).toHaveBeenCalledTimes(group.length);
    add.mockRestore();
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
