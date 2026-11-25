import { FailureKind, type PlatformErrorOptions } from '@platform/kernel';
import { MessagingError } from './messaging-error.js';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/** Failure that retrying does not fix. Goes straight to the dead-letter queue. */
export class PermanentMessageError extends MessagingError {
  constructor(
    message: string,
    options: Omit<PlatformErrorOptions, 'retryable' | 'failureKind'> = {},
  ) {
    super(MessagingErrorCode.PermanentError, message, {
      ...options,
      failureKind: FailureKind.Permanent,
    });
  }
}
