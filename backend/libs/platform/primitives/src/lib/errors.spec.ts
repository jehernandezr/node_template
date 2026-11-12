import { isErrorCode, PlatformError } from '@platform/kernel';
import * as primitives from '../index.js';
import {
  DeadlineExceededError,
  InvalidArgumentError,
  NonJsonValueError,
  PrimitivesErrorCode,
  StaleClaimError,
} from './errors.js';

describe('primitives errors', () => {
  it.each(Object.values(PrimitivesErrorCode))(
    'code %s has the SERVICE.SUBMODULE.ERROR format',
    (code) => {
      expect(isErrorCode(code)).toBe(true);
    },
  );

  it.each([
    [new InvalidArgumentError('x', 'y'), PrimitivesErrorCode.InvalidArgument],
    [new NonJsonValueError('$', 'z'), PrimitivesErrorCode.NonJsonValue],
    [new DeadlineExceededError(1), PrimitivesErrorCode.DeadlineExceeded],
    [new StaleClaimError('release'), PrimitivesErrorCode.StaleClaim],
  ])('%p is a non-retryable PlatformError with its code', (error, code) => {
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.code).toBe(code);
    expect(error.retryable).toBe(false);
    expect(error.name).toBe(error.constructor.name);
  });
});

describe('public API', () => {
  it('exposes every module from the package root', () => {
    expect(Object.keys(primitives).sort()).toEqual(
      [
        'BackoffStrategy',
        'CallOutcome',
        'CallOutcomeKind',
        'ClaimState',
        'DEFAULT_LEASE_MARGIN_MS',
        'DEFAULT_RETRY_AFTER_MAX_MS',
        'Deadline',
        'DeadlineExceededError',
        'FailureKind',
        'InMemoryIdempotencyStore',
        'InvalidArgumentError',
        'MAX_BACKOFF_ATTEMPT',
        'MAX_CANONICAL_JSON_DEPTH',
        'MAX_CAUSE_DEPTH',
        'MAX_FINGERPRINT_LENGTH',
        'MAX_IDEMPOTENCY_KEY_LENGTH',
        'NonJsonValueError',
        'PrimitivesErrorCode',
        'StaleClaimError',
        'assertClaimInput',
        'backoffDelay',
        'canonicalJson',
        'canonicalize',
        'classifyFailure',
        'computeLeaseUntil',
        'createBackoff',
        'fnv1a32',
        'fnv1a32Hex',
        'isFinalOutcome',
        'isSuccess',
        'isTransientError',
        'retryAfterMs',
        'stableDigest',
        'validateBackoffOptions',
      ].sort(),
    );
  });
});
