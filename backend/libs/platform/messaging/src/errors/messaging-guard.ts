import { Guard } from '@platform/kernel';
import { MessagingError } from './messaging-error.js';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/** Guarda de `@platform/messaging`: toda violación sale como `MessagingError` `InvalidOptions`. */
export class MessagingGuard {
  static readonly instance = new Guard(
    (message) => new MessagingError(MessagingErrorCode.InvalidOptions, message),
  );
}
