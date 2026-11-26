import { BloomMath } from '../bloom-math.js';

describe('BloomMath.murmur3', () => {
  it('matches the reference vectors', () => {
    expect(BloomMath.murmur3('')).toBe(0);
    expect(BloomMath.murmur3('ab')).toBe(0x9bbfd75f);
    expect(BloomMath.murmur3('hello')).toBe(0x248bfa47);
    expect(
      BloomMath.murmur3(
        'The quick brown fox jumps over the lazy dog',
        0x9747b28c,
      ),
    ).toBe(0x2fa826cd);
  });

  it('changes with the seed', () => {
    expect(BloomMath.murmur3('item', 1)).not.toBe(BloomMath.murmur3('item', 2));
  });
});

describe('BloomMath.positions', () => {
  it('pins the exact bit positions for a fixed input and parameters', () => {
    expect(BloomMath.positions('pinned-item', 1000, 5)).toEqual([
      5, 568, 131, 695, 261,
    ]);
    expect(BloomMath.positions('pinned-item', 1_000_000, 7)).toEqual([
      900005, 991568, 83131, 174695, 266261, 357830, 449403,
    ]);
  });

  it('returns exactly k positions inside [0, m)', () => {
    const positions = BloomMath.positions('any', 97, 32);
    expect(positions).toHaveLength(32);
    expect(positions.every((position) => position >= 0 && position < 97)).toBe(
      true,
    );
  });
});

describe('BloomMath.partitionOf', () => {
  it.each(['alpha', 'beta', 'gamma-42'])(
    'returns a stable index inside the range for %p',
    (item) => {
      const index = BloomMath.partitionOf(item, 7);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
      expect(BloomMath.partitionOf(item, 7)).toBe(index);
    },
  );

  it('uses the partition seed, not the bit position seed', () => {
    expect(BloomMath.partitionOf('seeded', 1_000_000)).toBe(
      BloomMath.murmur3('seeded', BloomMath.PARTITION_HASH_SEED) % 1_000_000,
    );
  });
});
