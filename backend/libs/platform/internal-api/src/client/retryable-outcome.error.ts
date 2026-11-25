import type {
  TransientFailureOutcome,
  UncertainOutcome,
} from '@platform/primitives';

/**
 * Flow control: an attempt that ended in a non-final result throws it
 * so the `ResilienceRegistry` retries it (`retryable` marks it as
 * transient and `retryAfterMs` is the wait hint it already knows how to read). If no
 * attempts remain, the `CallErrorTranslator` converts it back into its
 * result. It never leaves the client.
 */
export class RetryableOutcomeError extends Error {
  readonly retryable = true;
  readonly retryAfterMs: number | undefined;

  constructor(readonly outcome: TransientFailureOutcome | UncertainOutcome) {
    super(outcome.reason);
    this.name = 'RetryableOutcomeError';
    this.retryAfterMs =
      'retryAfterMs' in outcome ? outcome.retryAfterMs : undefined;
  }
}
