import * as primitives from '../index.js';

describe('public API', () => {
  it('exposes every module from the package root', () => {
    expect(Object.keys(primitives).sort()).toEqual(
      [
        'Backoff',
        'BackoffStrategy',
        'CallOutcome',
        'CallOutcomeFactory',
        'CallOutcomeKind',
        'CanonicalJson',
        'ClaimRules',
        'Deadline',
        'DeadlineExceededError',
        'FailureClassifier',
        'FailureRule',
        'Hashes',
        'InMemoryIdempotencyStore',
        'InvalidArgumentError',
        'NonJsonValueError',
        'PrimitivesErrorCode',
        'PrimitivesGuard',
        'RetryAfterParser',
        'RetryPolicy',
        'StaleClaimError',
        'TimerScheduler',
        'isFinalOutcome',
        'isSuccess',
        'kernelErrorCatalog',
        'primitivesErrorCatalog',
      ].sort(),
    );
  });
});
