import {
  BloomError,
  BloomErrorCode,
  CorruptedData,
  DuplicateFilter,
  IncompatibleFilters,
  InvalidParameters,
  UnknownFilter,
} from './bloom-error.js';

describe('bloom errors', () => {
  it.each([
    [
      new InvalidParameters('x'),
      BloomErrorCode.InvalidParameters,
      'PLATFORM.BLOOM.INVALID_PARAMETERS',
    ],
    [
      new CorruptedData('x'),
      BloomErrorCode.CorruptedData,
      'PLATFORM.BLOOM.CORRUPTED_DATA',
    ],
    [
      new IncompatibleFilters('x'),
      BloomErrorCode.IncompatibleFilters,
      'PLATFORM.BLOOM.INCOMPATIBLE_FILTERS',
    ],
    [
      new UnknownFilter('x'),
      BloomErrorCode.UnknownFilter,
      'PLATFORM.BLOOM.UNKNOWN_FILTER',
    ],
    [
      new DuplicateFilter('x'),
      BloomErrorCode.DuplicateFilter,
      'PLATFORM.BLOOM.DUPLICATE_FILTER',
    ],
  ])('exposes a stable code on %s', (error, code, value) => {
    expect(error).toBeInstanceOf(BloomError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.code).toBe(value);
    expect(error.name).toBe(error.constructor.name);
  });
});
