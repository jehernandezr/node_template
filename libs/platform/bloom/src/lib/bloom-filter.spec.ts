import {
  BloomFilter,
  BloomHashScheme,
  BLOOM_FORMAT_VERSION,
  type SerializedBloomFilter,
} from './bloom-filter.js';
import {
  CorruptedData,
  IncompatibleFilters,
  InvalidParameters,
} from './bloom-error.js';

describe('BloomFilter', () => {
  const INSERTED = 10_000;

  function filledFilter(): BloomFilter {
    const filter = BloomFilter.create({
      expectedItems: INSERTED,
      falsePositiveRate: 0.01,
    });
    for (let i = 0; i < INSERTED; i++) {
      filter.add(`item-${i}`);
    }
    return filter;
  }

  function validSerialized(
    overrides: Partial<Record<keyof SerializedBloomFilter, unknown>>,
  ): SerializedBloomFilter {
    return {
      version: BLOOM_FORMAT_VERSION,
      scheme: BloomHashScheme.EnhancedDoubleHashing,
      bits: 16,
      hashes: 2,
      data: 'AAA=',
      ...overrides,
    } as unknown as SerializedBloomFilter;
  }

  it('has no false negatives', () => {
    const filter = filledFilter();
    for (let i = 0; i < INSERTED; i++) {
      expect(filter.mightContain(`item-${i}`)).toBe(true);
    }
  });

  it('keeps the measured false positive rate below twice the target', () => {
    const filter = filledFilter();
    let positives = 0;
    for (let i = 0; i < INSERTED; i++) {
      if (filter.mightContain(`absent-${i}`)) {
        positives++;
      }
    }
    expect(positives / INSERTED).toBeLessThan(0.02);
  });

  it('estimates the item count and false positive rate', () => {
    const filter = filledFilter();
    expect(
      Math.abs(filter.approximateCount() - INSERTED) / INSERTED,
    ).toBeLessThan(0.05);
    expect(filter.estimatedFalsePositiveRate()).toBeGreaterThan(0.001);
    expect(filter.estimatedFalsePositiveRate()).toBeLessThan(0.02);
  });

  it('reports an empty filter as empty', () => {
    const filter = new BloomFilter({ bits: 64, hashes: 3 });
    expect(filter.approximateCount()).toBe(0);
    expect(filter.estimatedFalsePositiveRate()).toBe(0);
    expect(filter.mightContain('anything')).toBe(false);
  });

  it('round-trips through serialize and deserialize', () => {
    const filter = filledFilter();
    const serialized = filter.serialize();
    expect(serialized.version).toBe(1);
    expect(serialized.scheme).toBe('fnv1a32+murmur3_32/edh');
    const restored = BloomFilter.deserialize(
      JSON.parse(JSON.stringify(serialized)),
    );
    expect(restored.bits).toBe(filter.bits);
    expect(restored.hashes).toBe(filter.hashes);
    expect(restored.serialize()).toEqual(serialized);
    expect(restored.mightContain('item-42')).toBe(true);
  });

  it('round-trips a large filter without overflowing the stack', () => {
    const filter = new BloomFilter({ bits: 5_000_000, hashes: 7 });
    for (let i = 0; i < 1_000; i++) {
      filter.add(`large-${i}`);
    }
    const serialized = filter.serialize();
    expect(serialized.data.length).toBeGreaterThan(800_000);
    const restored = BloomFilter.deserialize(serialized);
    expect(restored.serialize()).toEqual(serialized);
    expect(restored.mightContain('large-999')).toBe(true);
  });

  it('rejects data whose length does not match the bit count', () => {
    expect(
      () => new BloomFilter({ bits: 64, hashes: 3, data: new Uint8Array(3) }),
    ).toThrow(CorruptedData);
    expect(() =>
      BloomFilter.deserialize(
        validSerialized({ bits: 64, hashes: 3, data: 'AAA=' }),
      ),
    ).toThrow(CorruptedData);
  });

  it('rejects non-canonical or malformed base64', () => {
    expect(() =>
      BloomFilter.deserialize(
        validSerialized({ bits: 8, hashes: 1, data: 'not base64!' }),
      ),
    ).toThrow(CorruptedData);
    // 'AB==' decodes to one byte whose trailing bits are non-zero, so re-encoding gives 'AA=='
    expect(() =>
      BloomFilter.deserialize(
        validSerialized({ bits: 8, hashes: 1, data: 'AB==' }),
      ),
    ).toThrow(CorruptedData);
  });

  it('rejects set unused tail bits on construction and deserialization', () => {
    // bits = 10 uses bit positions 0..9; in the last byte only in-byte bits 0 and 1 are valid
    expect(
      () =>
        new BloomFilter({
          bits: 10,
          hashes: 1,
          data: Uint8Array.of(0, 0b0000_0100),
        }),
    ).toThrow(CorruptedData);
    expect(() =>
      BloomFilter.deserialize(
        validSerialized({ bits: 10, hashes: 1, data: 'AAQ=' }),
      ),
    ).toThrow(CorruptedData);
    expect(
      () =>
        new BloomFilter({
          bits: 10,
          hashes: 1,
          data: Uint8Array.of(0, 0b0000_0010),
        }),
    ).not.toThrow();
  });

  it('rejects unknown format versions and hash schemes', () => {
    expect(() =>
      BloomFilter.deserialize(validSerialized({ version: 2 })),
    ).toThrow(CorruptedData);
    expect(() =>
      BloomFilter.deserialize(validSerialized({ version: undefined })),
    ).toThrow(CorruptedData);
    expect(() =>
      BloomFilter.deserialize(
        validSerialized({ scheme: 'fnv1a32+murmur3_32/kirsch' }),
      ),
    ).toThrow(CorruptedData);
  });

  it('unions two compatible filters without mutating them', () => {
    const left = BloomFilter.create({
      expectedItems: 100,
      falsePositiveRate: 0.01,
    });
    const right = BloomFilter.create({
      expectedItems: 100,
      falsePositiveRate: 0.01,
    });
    left.add('only-left');
    right.add('only-right');

    const merged = left.union(right);
    expect(merged.mightContain('only-left')).toBe(true);
    expect(merged.mightContain('only-right')).toBe(true);
    expect(left.mightContain('only-right')).toBe(false);
    expect(right.mightContain('only-left')).toBe(false);
  });

  it('refuses to union filters with different parameters', () => {
    const left = new BloomFilter({ bits: 64, hashes: 3 });
    const right = new BloomFilter({ bits: 128, hashes: 3 });
    expect(() => left.union(right)).toThrow(IncompatibleFilters);
  });

  it.each([
    [0, 3],
    [64, 0],
    [1.5, 3],
    [64, 33],
    [64, 1.5],
    [2 ** 32 + 1, 3],
  ])('rejects bits=%p hashes=%p with InvalidParameters', (bits, hashes) => {
    expect(() => new BloomFilter({ bits, hashes })).toThrow(InvalidParameters);
  });

  it('accepts the hash bound of 32', () => {
    expect(() => new BloomFilter({ bits: 64, hashes: 32 })).not.toThrow();
  });
});
