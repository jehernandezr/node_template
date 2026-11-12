import { PlatformError } from '@platform/kernel';
import { fnv1a32 as primitivesFnv1a32 } from '@platform/primitives';
import { BloomError, CorruptedData } from './bloom-error.js';
import { BloomFilter, type SerializedBloomFilter } from './bloom-filter.js';
import { fnv1a32 } from './hashing.js';

describe('compatibilidad de bloom', () => {
  it('lee un payload serializado con el formato v1 original', () => {
    const old = {
      version: 1,
      scheme: 'fnv1a32+murmur3_32/edh',
      bits: 64,
      hashes: 3,
      data: 'gAAAAiAJAQA=',
    } as SerializedBloomFilter;
    const filter = BloomFilter.deserialize(old);
    expect(filter.mightContain('alpha')).toBe(true);
    expect(filter.mightContain('beta')).toBe(true);
    expect(filter.mightContain('gamma-missing-item')).toBe(false);
    expect(filter.serialize()).toEqual(old);
  });

  it('el alias fnv1a32 es el de primitives', () => {
    expect(fnv1a32).toBe(primitivesFnv1a32);
  });

  it('los errores extienden PlatformError', () => {
    const error = new CorruptedData('x');
    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toBeInstanceOf(BloomError);
    expect(error.name).toBe('CorruptedData');
    expect(error.retryable).toBe(false);
  });
});
