import { FailureKind } from '@platform/kernel';
import { MessagingError } from '../messaging-error.js';
import { MessagingErrorCode } from '../messaging-error-code.enum.js';
import { PermanentMessageError } from '../permanent-message.error.js';

describe('PermanentMessageError', () => {
  it('carries the PermanentError code', () => {
    expect(new PermanentMessageError('gone').code).toBe(
      MessagingErrorCode.PermanentError,
    );
  });

  it('is a permanent failure that is never retryable', () => {
    const error = new PermanentMessageError('gone');

    expect(error).toBeInstanceOf(MessagingError);
    expect(error.failureKind).toBe(FailureKind.Permanent);
    expect(error.retryable).toBe(false);
  });
});
