import {
  BloomError,
  BloomErrorCode,
  CorruptedData,
  IncompatibleFilters,
  InvalidParameters,
} from '../bloom-error.js';

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
  ])('exposes a stable code on %s', (error, code, value) => {
    expect(error).toBeInstanceOf(BloomError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.code).toBe(value);
    expect(error.name).toBe(error.constructor.name);
  });
});
