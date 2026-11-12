import { z } from 'zod';
import { MessagingError } from '../errors/messaging-error.js';
import {
  ErrorDisposition,
  PermanentMessageError,
  classifyError,
  isPermanentByDefault,
} from './classify-error.js';

describe('classifyError', () => {
  it('treats PermanentMessageError as dead letter', () => {
    expect(classifyError(new PermanentMessageError('x'))).toBe(
      ErrorDisposition.DeadLetter,
    );
    expect(new PermanentMessageError('x')).toBeInstanceOf(MessagingError);
  });

  it('retries plain errors and zod errors by default', () => {
    expect(classifyError(new Error('network'))).toBe(ErrorDisposition.Retry);
    expect(classifyError(new z.ZodError([]))).toBe(ErrorDisposition.Retry);
  });

  it('uses a custom permanence rule when given', () => {
    expect(classifyError(new Error('x'), () => true)).toBe(
      ErrorDisposition.DeadLetter,
    );
    expect(classifyError(new PermanentMessageError('x'), () => false)).toBe(
      ErrorDisposition.Retry,
    );
  });

  it('marks code plus retryable=false as permanent', () => {
    expect(isPermanentByDefault({ code: 'A.B.C', retryable: false })).toBe(
      true,
    );
    expect(isPermanentByDefault({ code: 'A.B.C' })).toBe(false);
    expect(isPermanentByDefault({ retryable: false })).toBe(false);
    expect(isPermanentByDefault(null)).toBe(false);
    expect(isPermanentByDefault('text')).toBe(false);
  });
});
