import { DomainError, FailureKind } from '@platform/kernel';
import { CallOutcome } from './call-outcome.js';
import type { FailureClassifier } from './failure/failure-classifier.js';

/**
 * Converts a thrown value into a `CallOutcome`. Receives the classifier so
 * that each adapter adds its failure rules without touching this calculation:
 * - `DomainError` → `business-error` with its code, message and details; if it is
 *   `retryable`, `transient-failure` (not final, releases the idempotency claim).
 * - `Transient` → `transient-failure`.
 * - `Timeout` and `Cancelled` → `uncertain`.
 * - `ProtocolViolation` and the rest of `Permanent` → `protocol-violation`.
 */
export class CallOutcomeFactory {
  constructor(private readonly classifier: FailureClassifier) {}

  fromError(error: unknown): CallOutcome<never> {
    if (error instanceof DomainError) {
      return CallOutcomeFactory.fromDomainError(error);
    }
    const reason = CallOutcomeFactory.reasonOf(error);
    switch (this.classifier.classify(error)) {
      case FailureKind.Transient:
        return CallOutcome.transientFailure(reason, { cause: error });
      case FailureKind.Timeout:
      case FailureKind.Cancelled:
        return CallOutcome.uncertain(reason, error);
      case FailureKind.ProtocolViolation:
      case FailureKind.Permanent:
        return CallOutcome.protocolViolation(
          reason,
          CallOutcomeFactory.textCodeOf(error),
        );
    }
  }

  private static fromDomainError(error: DomainError): CallOutcome<never> {
    if (error.retryable) {
      // A retryable conflict is not a final result: it is not stored for idempotency.
      return CallOutcome.transientFailure(error.code, { cause: error });
    }
    return CallOutcome.businessError(error.code, {
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }

  /** Readable reason without copying the error message, which may carry input data. */
  private static reasonOf(error: unknown): string {
    const code = CallOutcomeFactory.textCodeOf(error);
    if (code !== undefined && code !== '') {
      return code;
    }
    const name = CallOutcomeFactory.propertyOf(error, 'name');
    return typeof name === 'string' && name !== '' ? name : typeof error;
  }

  private static textCodeOf(error: unknown): string | undefined {
    const code = CallOutcomeFactory.propertyOf(error, 'code');
    return typeof code === 'string' ? code : undefined;
  }

  private static propertyOf(error: unknown, key: 'code' | 'name'): unknown {
    return typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)[key]
      : undefined;
  }
}
