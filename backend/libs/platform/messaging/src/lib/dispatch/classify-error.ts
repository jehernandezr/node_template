import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';

/** A failure that retrying cannot fix. Goes straight to the dead-letter queue. */
export class PermanentMessageError extends MessagingError {
  constructor(message: string, options?: ErrorOptions) {
    super(MessagingErrorCode.PermanentError, message, options);
  }
}

/** What to do with a failed delivery. */
export enum ErrorDisposition {
  Retry = 'retry',
  DeadLetter = 'dead-letter',
}

/** Decides whether an error is permanent. */
export type PermanenceCheck = (error: unknown) => boolean;

/**
 * Default permanence rule: {@link PermanentMessageError}, or a domain error with a
 * string `code` and `retryable === false`. Zod errors are not permanent by default.
 */
export function isPermanentByDefault(error: unknown): boolean {
  if (error instanceof PermanentMessageError) return true;
  if (typeof error !== 'object' || error === null) return false;
  const { code, retryable } = error as { code?: unknown; retryable?: unknown };
  return typeof code === 'string' && retryable === false;
}

/** Maps an error to a disposition using the given permanence rule. */
export function classifyError(
  error: unknown,
  isPermanent: PermanenceCheck = isPermanentByDefault,
): ErrorDisposition {
  return isPermanent(error)
    ? ErrorDisposition.DeadLetter
    : ErrorDisposition.Retry;
}
