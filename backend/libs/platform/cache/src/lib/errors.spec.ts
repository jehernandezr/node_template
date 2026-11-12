import { isErrorCode, PlatformError } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import {
  CacheCorruptEntryError,
  CacheError,
  CacheErrorCode,
  CacheInvalidArgumentError,
  CacheKeyTooLongError,
  CacheNotACounterError,
  CacheTimeoutError,
  CacheValueTooLargeError,
} from './errors.js';

describe('cache errors', () => {
  it.each(Object.values(CacheErrorCode))(
    'uses the SERVICE.SUBMODULE.ERROR format for %s',
    (code) => {
      expect(isErrorCode(code)).toBe(true);
    },
  );

  it.each([
    [new CacheInvalidArgumentError('x', 'y'), FailureKind.ProtocolViolation],
    [new CacheKeyTooLongError(600, 512), FailureKind.ProtocolViolation],
    [new CacheValueTooLargeError(2, 1), FailureKind.Permanent],
    [new CacheNotACounterError(), FailureKind.Permanent],
    [new CacheTimeoutError(50), FailureKind.Timeout],
    [
      new CacheCorruptEntryError('not an envelope'),
      FailureKind.ProtocolViolation,
    ],
  ])('%p is a non-retryable PlatformError classified as %s', (error, kind) => {
    expect(error).toBeInstanceOf(CacheError);
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.retryable).toBe(false);
    expect(classifyFailure(error)).toBe(kind);
    expect(error.name).toBe(error.constructor.name);
  });

  it('keeps sizes in details, never keys or values', () => {
    expect(new CacheKeyTooLongError(600, 512).details).toEqual({
      length: 600,
      maxLength: 512,
    });
    expect(new CacheValueTooLargeError(2_048, 1_024).details).toEqual({
      bytes: 2_048,
      maxBytes: 1_024,
    });
  });
});
