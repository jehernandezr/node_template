import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import * as primitives from '../index.js';
import {
  DeadlineExceededError,
  InvalidArgumentError,
  NonJsonValueError,
  StaleClaimError,
} from './errors.js';

describe('primitives errors', () => {
  it.each([
    [
      new InvalidArgumentError('x', 'y'),
      PlatformErrorCode.PrimitivesInvalidArgument,
    ],
    [new NonJsonValueError('$', 'z'), PlatformErrorCode.PrimitivesNonJsonValue],
    [
      new DeadlineExceededError(1),
      PlatformErrorCode.PrimitivesDeadlineExceeded,
    ],
    [new StaleClaimError('release'), PlatformErrorCode.PrimitivesStaleClaim],
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
        'IsolationLevel',
        'MAX_TIMER_MS',
        'RaceStop',
        'abortReason',
        'abortableSleep',
        'armTimer',
        'raceDeadline',
        'MAX_BACKOFF_ATTEMPT',
        'MAX_CANONICAL_JSON_DEPTH',
        'MAX_CAUSE_DEPTH',
        'MAX_FINGERPRINT_LENGTH',
        'MAX_IDEMPOTENCY_KEY_LENGTH',
        'NonJsonValueError',
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
