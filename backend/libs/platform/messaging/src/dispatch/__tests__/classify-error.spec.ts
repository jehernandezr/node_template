import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';
import { z } from 'zod';
import { MessagingError } from '../../errors/messaging-error.js';
import {
  ErrorDisposition,
  PermanentMessageError,
  classifyError,
  dispositionFor,
  isPermanentFailure,
} from '../classify-error.js';

describe('classifyError', () => {
  it('treats PermanentMessageError as dead letter', () => {
    const error = new PermanentMessageError('x');
    expect(classifyError(error)).toBe(ErrorDisposition.DeadLetter);
    expect(error).toBeInstanceOf(MessagingError);
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.retryable).toBe(false);
  });

  it('follows the shared classifyFailure rule', () => {
    expect(
      classifyError(Object.assign(new Error('x'), { retryable: true })),
    ).toBe(ErrorDisposition.Retry);
    expect(
      classifyError(Object.assign(new Error('x'), { code: 'ECONNRESET' })),
    ).toBe(ErrorDisposition.Retry);
    expect(classifyError({ status: 503 })).toBe(ErrorDisposition.Retry);
    expect(
      classifyError(Object.assign(new Error('x'), { name: 'AbortError' })),
    ).toBe(ErrorDisposition.Retry);
    // Unknown errors and implementation bugs are not retried.
    expect(classifyError(new Error('network'))).toBe(
      ErrorDisposition.DeadLetter,
    );
    expect(classifyError(new z.ZodError([]))).toBe(ErrorDisposition.DeadLetter);
    expect(classifyError({ status: 404 })).toBe(ErrorDisposition.DeadLetter);
  });

  it('keeps a messaging error final unless it was declared retryable', () => {
    const transientCause = Object.assign(new Error('reset'), {
      code: 'ECONNRESET',
    });
    const rejected = new MessagingError(
      PlatformErrorCode.MessagingTransportFailed,
      'rejected',
      { retryable: false, cause: transientCause },
    );
    const throttled = new MessagingError(
      PlatformErrorCode.MessagingTransportFailed,
      'throttled',
      { retryable: true },
    );
    expect(rejected.failureKind).toBe(FailureKind.Permanent);
    expect(isPermanentFailure(rejected)).toBe(true);
    expect(throttled.failureKind).toBe(FailureKind.Transient);
    expect(throttled.retryable).toBe(true);
    expect(isPermanentFailure(throttled)).toBe(false);
  });

  it('maps every failure kind to a disposition', () => {
    expect(dispositionFor(FailureKind.Transient)).toBe(ErrorDisposition.Retry);
    expect(dispositionFor(FailureKind.Timeout)).toBe(ErrorDisposition.Retry);
    expect(dispositionFor(FailureKind.Cancelled)).toBe(ErrorDisposition.Retry);
    expect(dispositionFor(FailureKind.Permanent)).toBe(
      ErrorDisposition.DeadLetter,
    );
    expect(dispositionFor(FailureKind.ProtocolViolation)).toBe(
      ErrorDisposition.DeadLetter,
    );
  });

  it('uses a custom permanence rule when given', () => {
    expect(classifyError(new Error('x'), () => true)).toBe(
      ErrorDisposition.DeadLetter,
    );
    expect(classifyError(new PermanentMessageError('x'), () => false)).toBe(
      ErrorDisposition.Retry,
    );
  });
});
