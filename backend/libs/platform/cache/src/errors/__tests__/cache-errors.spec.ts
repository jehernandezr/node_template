import { FailureKind, PlatformError } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { CacheCorruptEntryError } from '../cache-corrupt-entry.error.js';
import { CacheError } from '../cache-error.js';
import { CacheErrorCode } from '../cache-error-code.enum.js';
import { CacheInvalidArgumentError } from '../cache-invalid-argument.error.js';
import { CacheKeyTooLongError } from '../cache-key-too-long.error.js';
import { CacheTimeoutError } from '../cache-timeout.error.js';
import { CacheValueTooLargeError } from '../cache-value-too-large.error.js';

describe('cache errors', () => {
  it.each([
    [
      new CacheInvalidArgumentError('ttlMs', 'a finite number'),
      CacheErrorCode.InvalidArgument,
      FailureKind.ProtocolViolation,
      false,
      { argument: 'ttlMs', expectation: 'a finite number' },
    ],
    [
      new CacheKeyTooLongError(600, 512),
      CacheErrorCode.KeyTooLong,
      FailureKind.ProtocolViolation,
      false,
      { length: 600, maxLength: 512 },
    ],
    [
      new CacheValueTooLargeError(2, 1),
      CacheErrorCode.ValueTooLarge,
      FailureKind.Permanent,
      false,
      { bytes: 2, maxBytes: 1 },
    ],
    [
      new CacheTimeoutError(50),
      CacheErrorCode.Timeout,
      FailureKind.Timeout,
      true,
      { timeoutMs: 50 },
    ],
    [
      new CacheCorruptEntryError('not an envelope'),
      CacheErrorCode.CorruptEntry,
      FailureKind.ProtocolViolation,
      false,
      { reason: 'not an envelope' },
    ],
  ])(
    '%s has its code, failure kind, retryability and details',
    (error, code, kind, retryable, details) => {
      expect(error).toBeInstanceOf(CacheError);
      expect(error).toBeInstanceOf(PlatformError);
      expect(error.code).toBe(code);
      expect(new FailureClassifier().classify(error)).toBe(kind);
      expect(error.retryable).toBe(retryable);
      expect(error.details).toEqual(details);
    },
  );
});
