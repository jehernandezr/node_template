import { FailureKind, PlatformError } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { BloomError } from '../bloom-error.js';
import { BloomErrorCode } from '../bloom-error-code.enum.js';
import { CorruptedDataError } from '../corrupted-data.error.js';
import { IncompatibleFiltersError } from '../incompatible-filters.error.js';
import { InvalidParametersError } from '../invalid-parameters.error.js';

describe('bloom errors', () => {
  it.each([
    [
      new InvalidParametersError('bits'),
      BloomErrorCode.InvalidParameters,
      FailureKind.ProtocolViolation,
    ],
    [
      new CorruptedDataError('bytes'),
      BloomErrorCode.CorruptedData,
      FailureKind.Permanent,
    ],
    [
      new IncompatibleFiltersError('params'),
      BloomErrorCode.IncompatibleFilters,
      FailureKind.ProtocolViolation,
    ],
  ])(
    '%s has its code and failure kind and is not retryable',
    (error, code, kind) => {
      expect(error).toBeInstanceOf(BloomError);
      expect(error).toBeInstanceOf(PlatformError);
      expect(error.code).toBe(code);
      expect(error.retryable).toBe(false);
      expect(new FailureClassifier().classify(error)).toBe(kind);
    },
  );

  it('names each error after its class', () => {
    expect(new InvalidParametersError('x').name).toBe('InvalidParametersError');
    expect(new CorruptedDataError('x').name).toBe('CorruptedDataError');
    expect(new IncompatibleFiltersError('x').name).toBe(
      'IncompatibleFiltersError',
    );
  });
});
