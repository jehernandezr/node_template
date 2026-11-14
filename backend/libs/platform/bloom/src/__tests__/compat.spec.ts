import { PlatformError } from '@platform/kernel';
import { BloomSizing } from '../bloom-sizing.js';
import { BloomFilter } from '../bloom-filter.js';
import { CorruptedDataError } from '../errors/corrupted-data.error.js';
import { BloomError } from '../errors/bloom-error.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';
import {
  DEFAULT_FALSE_POSITIVE_RATE,
  InvalidParameters,
  requiredBits,
} from '../deprecated-exports.js';
import { InvalidParametersError } from '../errors/invalid-parameters.error.js';
import type { SerializedBloomFilter } from '../serialized-bloom-filter.js';

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

  it('los errores extienden PlatformError', () => {
    const error = new CorruptedDataError('x');
    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toBeInstanceOf(BloomError);
    expect(error.name).toBe('CorruptedDataError');
    expect(error.retryable).toBe(false);
  });

  it('exponen los alias deprecados de las funciones anteriores', () => {
    expect(new InvalidParameters('x')).toBeInstanceOf(InvalidParametersError);
    expect(requiredBits).toBe(BloomSizing.requiredBits);
    expect(DEFAULT_FALSE_POSITIVE_RATE).toBe(
      BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
    );
    expect(new InvalidParametersError('x').code).toBe(
      BloomErrorCode.InvalidParameters,
    );
  });
});
