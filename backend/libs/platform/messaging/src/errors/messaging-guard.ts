import { Guard } from '@platform/kernel';
import { MessagingError } from './messaging-error.js';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/** Guard of `@platform/messaging`: every violation surfaces as a `MessagingError` `InvalidOptions`. */
export class MessagingGuard {
  static readonly instance = new Guard(
    (message) => new MessagingError(MessagingErrorCode.InvalidOptions, message),
  );
}
