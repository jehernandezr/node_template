import { FailureClassifier } from '../../failure/failure-classifier.js';
import { FailureKind, PlatformError } from '@platform/kernel';
import { DeadlineExceededError } from '../deadline-exceeded.error.js';
import { InvalidArgumentError } from '../invalid-argument.error.js';
import { NonJsonValueError } from '../non-json-value.error.js';
import { PrimitivesErrorCode } from '../primitives-error-code.enum.js';
import { StaleClaimError } from '../stale-claim.error.js';

describe('primitives errors', () => {
  const classifier = new FailureClassifier();

  it.each([
    [
      new InvalidArgumentError('x', 'y'),
      PrimitivesErrorCode.InvalidArgument,
      FailureKind.ProtocolViolation,
    ],
    [
      new NonJsonValueError('$', 'z'),
      PrimitivesErrorCode.NonJsonValue,
      FailureKind.ProtocolViolation,
    ],
    [
      new DeadlineExceededError(1),
      PrimitivesErrorCode.DeadlineExceeded,
      FailureKind.Timeout,
    ],
    [
      new StaleClaimError('release'),
      PrimitivesErrorCode.StaleClaim,
      FailureKind.Permanent,
    ],
  ])('%p has its code and failure kind', (error, code, kind) => {
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.code).toBe(code);
    expect(error.retryable).toBe(false);
    expect(error.name).toBe(error.constructor.name);
    expect(classifier.classify(error)).toBe(kind);
  });

  it('keeps the details of each error', () => {
    expect(new InvalidArgumentError('x', 'y').details).toEqual({
      argument: 'x',
      expectation: 'y',
    });
    expect(new NonJsonValueError('$.a', 'bigint').details).toEqual({
      path: '$.a',
      reason: 'bigint',
    });
    expect(new DeadlineExceededError(5).details).toEqual({ deadlineAtMs: 5 });
    expect(new StaleClaimError('complete').details).toEqual({
      operation: 'complete',
    });
  });
});
