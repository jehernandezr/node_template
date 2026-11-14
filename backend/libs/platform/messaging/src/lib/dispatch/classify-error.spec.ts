import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';
import { z } from 'zod';
import { MessagingError } from '../errors/messaging-error.js';
import {
  ErrorDisposition,
  PermanentMessageError,
  classifyError,
  dispositionFor,
  isPermanentByDefault,
  isPermanentFailure,
} from './classify-error.js';

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

  it('keeps isPermanentByDefault as a deprecated alias of isPermanentFailure', () => {
    expect(isPermanentByDefault).toBe(isPermanentFailure);
    expect(isPermanentFailure({ code: 'A.B.C', retryable: false })).toBe(true);
    expect(isPermanentFailure({ code: 'A.B.C', retryable: true })).toBe(false);
  });
});
