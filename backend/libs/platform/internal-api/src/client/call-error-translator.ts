import { ResilienceTimeoutError, TimeoutScope } from '@platform/resilience';
import {
  CallOutcome,
  type CallOutcome as Outcome,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { CallErrorContext } from './call-error-context.js';
import { RetryableOutcomeError } from './retryable-outcome.error.js';

/** Convierte lo que lanza `ResilienceRegistry.execute` en el `CallOutcome` de la llamada. */
export class CallErrorTranslator {
  constructor(private readonly outcomes: CallOutcomeFactory) {}

  /**
   * En este orden:
   * - `RetryableOutcomeError`: su `outcome`.
   * - `context.signal` abortada: `uncertain` `cancelled` si `started`; si no, `transient-failure` `cancelled`.
   * - `ResilienceTimeoutError` de alcance `Attempt`: `uncertain` `timeout`.
   * - `ResilienceTimeoutError` de alcance `Total`: `uncertain` `timeout` si `started`; si no, `transient-failure` `deadline-exceeded`.
   * - Cualquier otro: `outcomes.fromError(error)`.
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
