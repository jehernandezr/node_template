import { PlatformErrorCode } from '@contracts/platform';
import type { PlatformErrorOptions } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import { MessagingError } from '../errors/messaging-error.js';

/** A failure that retrying cannot fix. Goes straight to the dead-letter queue. */
export class PermanentMessageError extends MessagingError {
  constructor(
    message: string,
    options: Omit<PlatformErrorOptions, 'retryable'> = {},
  ) {
    super(PlatformErrorCode.MessagingPermanentError, message, {
      ...options,
      failureKind: FailureKind.Permanent,
    });
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
 * Disposition of a failure of the given kind. A redelivery is guarded by the
 * processed-message claim, so an uncertain result (`Timeout`, `Cancelled`) is
 * retried like a `Transient` one. `Permanent` and `ProtocolViolation` go to the
 * dead-letter queue, where they can be inspected and redriven.
 */
export function dispositionFor(kind: FailureKind): ErrorDisposition {
  switch (kind) {
    case FailureKind.Transient:
    case FailureKind.Timeout:
    case FailureKind.Cancelled:
      return ErrorDisposition.Retry;
    case FailureKind.Permanent:
    case FailureKind.ProtocolViolation:
      return ErrorDisposition.DeadLetter;
  }
}

/**
 * Platform permanence rule, from `classifyFailure` of `@platform/primitives`:
 * permanent unless the error is transient, a timeout or a cancellation. As in
 * the rest of the platform, an error without any signal is not retried; throw
 * an error whose `failureKind` is `Transient` (or a `PlatformError` declared
 * `retryable`) to ask for a retry.
 */
export function isPermanentFailure(error: unknown): boolean {
  return dispositionFor(classifyFailure(error)) === ErrorDisposition.DeadLetter;
}

/** Maps an error to a disposition using the given permanence rule. */
export function classifyError(
  error: unknown,
  isPermanent: PermanenceCheck = isPermanentFailure,
): ErrorDisposition {
  return isPermanent(error)
    ? ErrorDisposition.DeadLetter
    : ErrorDisposition.Retry;
}
