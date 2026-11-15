import { CallOutcome, FailureClassifier } from '@platform/primitives';
import { RetryableOutcomeError } from '../retryable-outcome.error.js';

describe('RetryableOutcomeError', () => {
  it('is marked as retryable', () => {
    expect(
      new RetryableOutcomeError(CallOutcome.transientFailure('busy')).retryable,
    ).toBe(true);
  });

  it('inherits the retry hint of a transient failure', () => {
    const error = new RetryableOutcomeError(
      CallOutcome.transientFailure('busy', { retryAfterMs: 300 }),
    );

    expect(error.retryAfterMs).toBe(300);
  });

  it('has no retry hint for an uncertain outcome', () => {
    const error = new RetryableOutcomeError(CallOutcome.uncertain('timeout'));

    expect(error.retryAfterMs).toBeUndefined();
  });

  it('keeps the outcome it wraps', () => {
    const outcome = CallOutcome.uncertain('timeout');

    expect(new RetryableOutcomeError(outcome).outcome).toBe(outcome);
  });

  it('is classified as transient by the failure classifier', () => {
    const error = new RetryableOutcomeError(
      CallOutcome.transientFailure('busy'),
    );

    expect(new FailureClassifier().isTransient(error)).toBe(true);
  });
});
