import { ResilienceTimeoutError, TimeoutScope } from '@platform/resilience';
import {
  CallOutcome,
  type CallOutcome as Outcome,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { CallErrorContext } from './call-error-context.js';
import { RetryableOutcomeError } from './retryable-outcome.error.js';

/** Converts what `ResilienceRegistry.execute` throws into the `CallOutcome` of the call. */
export class CallErrorTranslator {
  constructor(private readonly outcomes: CallOutcomeFactory) {}

  /**
   * In this order:
   * - `RetryableOutcomeError`: its `outcome`.
   * - `context.signal` aborted: `uncertain` `cancelled` if `started`; otherwise, `transient-failure` `cancelled`.
   * - `ResilienceTimeoutError` with `Attempt` scope: `uncertain` `timeout`.
   * - `ResilienceTimeoutError` with `Total` scope: `uncertain` `timeout` if `started`; otherwise, `transient-failure` `deadline-exceeded`.
   * - Anything else: `outcomes.fromError(error)`.
   */
  translate(error: unknown, context: CallErrorContext): Outcome<unknown> {
    if (error instanceof RetryableOutcomeError) {
      return error.outcome;
    }
    if (context.signal?.aborted === true) {
      return context.started
        ? CallOutcome.uncertain(InternalApiReason.Cancelled)
        : CallOutcome.transientFailure(InternalApiReason.Cancelled);
    }
    if (error instanceof ResilienceTimeoutError) {
      if (error.scope === TimeoutScope.Attempt) {
        return CallOutcome.uncertain(InternalApiReason.Timeout);
      }
      return context.started
        ? CallOutcome.uncertain(InternalApiReason.Timeout)
        : CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded);
    }
    return this.outcomes.fromError(error);
  }
}
