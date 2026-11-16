import { BloomFilter } from '../bloom-filter.js';
import { BloomHashScheme } from '../bloom-hash-scheme.enum.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';
import type { SerializedBloomFilter } from '../serialized-bloom-filter.js';
import { BloomFixtures } from './utils/bloom-fixtures.js';

const INSERTED = 10_000;

describe('BloomFilter', () => {
  it('has no false negatives', () => {
    const filter = BloomFixtures.filledFilter(INSERTED);
    expect(
      BloomFixtures.countPositiveSync(
        filter,
        BloomFixtures.items('item', INSERTED),
      ),
    ).toBe(INSERTED);
  });

  it('keeps the measured false positive rate below twice the target', () => {
    const filter = BloomFixtures.filledFilter(INSERTED);
    const positives = BloomFixtures.countPositiveSync(
      filter,
      BloomFixtures.items('absent', INSERTED),
    );
    expect(positives / INSERTED).toBeLessThan(0.02);
  });

  it('estimates the item count and false positive rate', () => {
    const filter = BloomFixtures.filledFilter(INSERTED);
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

  it('reads a payload in the original v1 format', () => {
    const legacy = {
      version: 1,
      scheme: 'fnv1a32+murmur3_32/edh',
      bits: 64,
      hashes: 3,
      data: 'gAAAAiAJAQA=',
    } as SerializedBloomFilter;
    const filter = BloomFilter.deserialize(legacy);
    expect(filter.mightContain('alpha')).toBe(true);
    expect(filter.mightContain('beta')).toBe(true);
    expect(filter.mightContain('gamma-missing-item')).toBe(false);
    expect(filter.serialize()).toEqual(legacy);
  });

  it('round-trips through serialize and deserialize', () => {
    const filter = BloomFixtures.filledFilter(INSERTED);
    const serialized = filter.serialize();
    expect(serialized.version).toBe(1);
    expect(serialized.scheme).toBe(BloomHashScheme.EnhancedDoubleHashing);
    const restored = BloomFilter.deserialize(
      JSON.parse(JSON.stringify(serialized)),
    );
    expect(restored.bits).toBe(filter.bits);
    expect(restored.hashes).toBe(filter.hashes);
    expect(restored.serialize()).toEqual(serialized);
    expect(restored.mightContain('item-42')).toBe(true);
  });

  it('round-trips a large filter', () => {
    const filter = new BloomFilter({ bits: 5_000_000, hashes: 7 });
    BloomFixtures.addAll(filter, BloomFixtures.items('large', 1_000));
    const serialized = filter.serialize();
    expect(serialized.data.length).toBeGreaterThan(800_000);
    const restored = BloomFilter.deserialize(serialized);
    expect(restored.serialize()).toEqual(serialized);
    expect(restored.mightContain('large-999')).toBe(true);
  });

  it.each([['a byte array of the wrong length', new Uint8Array(3)]])(
    'rejects %s on construction',
    (_label, data) => {
      expect(() => new BloomFilter({ bits: 64, hashes: 3, data })).toThrow(
        expect.objectContaining({ code: BloomErrorCode.CorruptedData }),
      );
    },
  );

  it('rejects data whose length does not match the bit count on deserialization', () => {
    expect(() =>
      BloomFilter.deserialize(
        BloomFixtures.validSerialized({ bits: 64, hashes: 3, data: 'AAA=' }),
      ),
    ).toThrow(expect.objectContaining({ code: BloomErrorCode.CorruptedData }));
  });

  it.each([
    ['not base64!'],
    // 'AB==' decodifica a un byte con bits finales encendidos: al recodificar sale 'AA=='.
    ['AB=='],
  ])('rejects non-canonical or malformed base64 %p', (data) => {
    expect(() =>
      BloomFilter.deserialize(
        BloomFixtures.validSerialized({ bits: 8, hashes: 1, data }),
      ),
    ).toThrow(expect.objectContaining({ code: BloomErrorCode.CorruptedData }));
  });

  it('rejects set unused tail bits on construction and deserialization', () => {
    // Con bits = 10 solo los bits 0 y 1 de la última byte son válidos.
    expect(() =>
      BloomFilter.deserialize(
        BloomFixtures.validSerialized({ bits: 10, hashes: 1, data: 'AAQ=' }),
      ),
    ).toThrow(expect.objectContaining({ code: BloomErrorCode.CorruptedData }));
    expect(
      () =>
        new BloomFilter({
          bits: 10,
          hashes: 1,
          data: Uint8Array.of(0, 0b0000_0100),
        }),
    ).toThrow(expect.objectContaining({ code: BloomErrorCode.CorruptedData }));
  });

  it('accepts valid tail bits', () => {
    expect(
      () =>
        new BloomFilter({
          bits: 10,
          hashes: 1,
          data: Uint8Array.of(0, 0b0000_0010),
        }),
    ).not.toThrow();
  });

  it.each([
    [{ version: 2 }],
    [{ version: undefined }],
    [{ scheme: 'fnv1a32+murmur3_32/kirsch' }],
  ])('rejects an unknown version or scheme %p', (overrides) => {
    expect(() =>
      BloomFilter.deserialize(BloomFixtures.validSerialized(overrides)),
    ).toThrow(expect.objectContaining({ code: BloomErrorCode.CorruptedData }));
  });

  it('unions two compatible filters without mutating them', () => {
    const left = BloomFilter.create({ expectedItems: 100 });
    const right = BloomFilter.create({ expectedItems: 100 });
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
    expect(() => left.union(right)).toThrow(
      expect.objectContaining({ code: BloomErrorCode.IncompatibleFilters }),
    );
  });

  it.each([
    [0, 3],
    [64, 0],
    [1.5, 3],
    [64, 33],
    [64, 1.5],
    [2 ** 32 + 1, 3],
  ])('rejects bits=%p hashes=%p with InvalidParameters', (bits, hashes) => {
    expect(() => new BloomFilter({ bits, hashes })).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('accepts the hash bound of 32', () => {
    expect(() => new BloomFilter({ bits: 64, hashes: 32 })).not.toThrow();
  });
});
