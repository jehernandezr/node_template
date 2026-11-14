import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingErrorCode } from './errors.js';

function keys(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `key-${i}`);
}

function ringOf(nodes: string[], virtualNodes?: number): ConsistentHashRing {
  const ring = new ConsistentHashRing(virtualNodes);
  for (const node of nodes) {
    ring.add(node);
  }
  return ring;
}

describe('ConsistentHashRing', () => {
  it('returns undefined when empty', () => {
    expect(new ConsistentHashRing().locate('any')).toBeUndefined();
  });

  it('routes every key to the only node', () => {
    const ring = ringOf(['shard-a']);
    expect(keys(100).every((key) => ring.locate(key) === 'shard-a')).toBe(true);
  });

  it('adds nodes idempotently and lists them sorted', () => {
    const ring = ringOf(['shard-c', 'shard-a', 'shard-b']);
    ring.add('shard-a');
    expect(ring.nodes()).toEqual(['shard-a', 'shard-b', 'shard-c']);
  });

  it('removes nodes and ignores unknown ones', () => {
    const ring = ringOf(['shard-a', 'shard-b']);
    ring.remove('shard-a');
    ring.remove('missing');
    expect(ring.nodes()).toEqual(['shard-b']);
    expect(keys(100).every((key) => ring.locate(key) === 'shard-b')).toBe(true);
  });

  it('becomes empty after removing every node', () => {
    const ring = ringOf(['shard-a']);
    ring.remove('shard-a');
    expect(ring.nodes()).toEqual([]);
    expect(ring.locate('key')).toBeUndefined();
  });

  it('is deterministic regardless of insertion order', () => {
    const first = ringOf(['shard-a', 'shard-b', 'shard-c']);
    const second = ringOf(['shard-c', 'shard-b', 'shard-a']);
    for (const key of keys(500)) {
      expect(second.locate(key)).toBe(first.locate(key));
    }
  });

  it('distributes 10k keys across 4 nodes within 25% of the mean', () => {
    const nodes = ['shard-a', 'shard-b', 'shard-c', 'shard-d'];
    const ring = ringOf(nodes);
    const counts = new Map<string, number>(nodes.map((node) => [node, 0]));
    for (const key of keys(10_000)) {
      const node = ring.locate(key);
      counts.set(node ?? '', (counts.get(node ?? '') ?? 0) + 1);
    }
    const mean = 10_000 / nodes.length;
    for (const node of nodes) {
      const count = counts.get(node) ?? 0;
      expect(Math.abs(count - mean) / mean).toBeLessThanOrEqual(0.25);
    }
  });

  it('moves fewer than 35% of keys when a 5th node is added, all to the new node', () => {
    const before = ringOf(['shard-a', 'shard-b', 'shard-c', 'shard-d']);
    const after = ringOf([
      'shard-a',
      'shard-b',
      'shard-c',
      'shard-d',
      'shard-e',
    ]);
    const all = keys(10_000);
    let moved = 0;
    for (const key of all) {
      const previous = before.locate(key);
      const current = after.locate(key);
      if (previous !== current) {
        moved++;
        expect(current).toBe('shard-e');
      }
    }
    expect(moved / all.length).toBeLessThan(0.35);
  });

  it('only moves keys owned by a removed node', () => {
    const before = ringOf(['shard-a', 'shard-b', 'shard-c']);
    const after = ringOf(['shard-a', 'shard-b', 'shard-c']);
    after.remove('shard-b');
    for (const key of keys(5_000)) {
      if (before.locate(key) !== 'shard-b') {
        expect(after.locate(key)).toBe(before.locate(key));
      }
    }
  });

  it('accepts a custom number of virtual nodes', () => {
    const ring = ringOf(['shard-a', 'shard-b'], 1);
    expect(['shard-a', 'shard-b']).toContain(ring.locate('key'));
  });

  it('rejects a non-positive number of virtual nodes', () => {
    for (const virtualNodes of [0, 1.5]) {
      expect(() => new ConsistentHashRing(virtualNodes)).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    }
  });
});
