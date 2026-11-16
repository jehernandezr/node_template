import { FailureKind } from '@platform/kernel';
import { MessagingError } from '../messaging-error.js';
import { MessagingErrorCode } from '../messaging-error-code.enum.js';

describe('MessagingError', () => {
  it('carries the stable code it was built with', () => {
    const error = new MessagingError(MessagingErrorCode.TenantMismatch, 'x');

    expect(error.code).toBe(MessagingErrorCode.TenantMismatch);
    expect(error.message).toBe('x');
  });

  it('is permanent by default', () => {
    const error = new MessagingError(MessagingErrorCode.InvalidPayload, 'x');

    expect(error.failureKind).toBe(FailureKind.Permanent);
    expect(error.retryable).toBe(false);
  });

  it('is transient only when it is declared retryable', () => {
    const error = new MessagingError(MessagingErrorCode.TransportFailed, 'x', {
      retryable: true,
    });

    expect(error.failureKind).toBe(FailureKind.Transient);
    expect(error.retryable).toBe(true);
  });

  it('keeps the cause it wraps', () => {
    const cause = new Error('socket hang up');
    const error = new MessagingError(MessagingErrorCode.TransportFailed, 'x', {
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});
