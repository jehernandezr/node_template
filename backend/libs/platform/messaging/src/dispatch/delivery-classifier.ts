import {
  ErrorDescriptor,
  FailureKind,
  type RandomSource,
} from '@platform/kernel';
import { Backoff, type FailureClassifier } from '@platform/primitives';
import type { DispatchOptions } from './dispatch-options.js';
import type { DispatchResult } from './dispatch-result.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import { ErrorDisposition } from './error-disposition.enum.js';

/** Decides whether an error is permanent. */
export type PermanenceCheck = (error: unknown) => boolean;

/**
 * Decides what to do with a failed delivery: retry it with the wait of
 * the queue policy or send it to the dead-letter queue.
 */
export class DeliveryClassifier {
  constructor(
    private readonly failures: FailureClassifier,
    private readonly random: RandomSource,
    private readonly isPermanent?: PermanenceCheck,
  ) {}

  /**
   * Disposition of a failure. A consumer's own rule takes precedence over the
   * classifier. Without one, `Transient`, `Timeout` and `Cancelled` are retried
   * (the claim protects a repeated delivery); `Permanent` and
   * `ProtocolViolation` go to the dead-letter queue, where they can be inspected
   * and redriven.
   */
  disposition(error: unknown): ErrorDisposition {
    if (this.isPermanent !== undefined) {
      return this.isPermanent(error)
        ? ErrorDisposition.DeadLetter
        : ErrorDisposition.Retry;
    }
    switch (this.failures.classify(error)) {
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
   * `RetryLater` or `DeadLetter` result of a failure. An infrastructure
   * failure (`infrastructureFailure`: the claim or its closing did not reach
   * the database) is always retried and does not count against `maxAttempts`: a short
   * database outage does not send valid messages to the dead-letter queue; only the
   * generous queue `maxReceiveCount` bounds those retries. A
   * handler failure goes to the dead-letter queue when it is permanent, when there is no
   * policy or when `receiveCount` reached `maxAttempts`. The wait is
   * `Backoff.delay(receiveCount)`, with the attempt capped to what `Backoff` accepts.
   */
  failure(
    id: string,
    error: unknown,
    options: DispatchOptions,
    infrastructureFailure: boolean,
  ): DispatchResult {
    const disposition = infrastructureFailure
      ? ErrorDisposition.Retry
      : this.disposition(error);
    const message = ErrorDescriptor.describe(error).message;
    const code = ErrorDescriptor.codeOf(error);
    const policy = options.retryPolicy;
    if (
      disposition === ErrorDisposition.DeadLetter ||
      policy === undefined ||
      (!infrastructureFailure && options.receiveCount >= policy.maxAttempts)
    ) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id,
        error: message,
        ...(code === undefined ? {} : { code }),
      };
    }
    const attempt = Math.min(
      Math.max(options.receiveCount, 1),
      Backoff.MAX_ATTEMPT,
    );
    return {
      outcome: DispatchOutcome.RetryLater,
      id,
      delayMs: new Backoff(policy, this.random).delay(attempt),
      error: message,
      ...(code === undefined ? {} : { code }),
    };
  }
}
