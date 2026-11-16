import { isPlatformError } from '@platform/kernel';
import type { CompiledSaga, ForwardEntry } from '../definition/saga-flow.js';
import {
  type SagaInstance,
  SagaStatus,
  StepDirection,
  type StepLogEntry,
  StepStatus,
} from '../model.js';

// Pure transition rules of the engine: given an instance, its step log and the
// time, they compute the next instance. No I/O, so every rule is testable on
// its own and the engine only decides when to apply and persist them.

/** Limits of the suspension loop of a step. */
export interface SuspendPolicy {
  readonly maxSuspendAttempts: number;
  readonly maxSuspendAgeMs: number;
  /** Delay before retrying after the given failed attempt (1-based). */
  readonly backoff: (attempt: number) => number;
}

/** Longest `lastErrorDetail` kept, so a huge message cannot bloat the instance. */
export const MAX_ERROR_DETAIL_LENGTH = 300;

/**
 * Short description of an error thrown by service code (a step builder, an
 * `onSuccess` rule). A platform error gives its code and message, which by
 * convention carry no input values; any other error gives its name and
 * message. Truncated to {@link MAX_ERROR_DETAIL_LENGTH}.
 */
export function errorDetail(error: unknown): string {
  let text: string;
  if (isPlatformError(error)) {
    text = `${error.code}: ${error.message}`;
  } else if (error instanceof Error) {
    text = `${error.name}: ${error.message}`;
  } else {
    text = `thrown ${typeof error}`;
  }
  return text.length > MAX_ERROR_DETAIL_LENGTH
    ? `${text.slice(0, MAX_ERROR_DETAIL_LENGTH - 1)}…`
    : text;
}

/** Stops the saga until a person decides. */
export function requireIntervention(
  instance: SagaInstance,
  code: string,
  detail: string | null,
): SagaInstance {
  return {
    ...instance,
    status: SagaStatus.RequiresIntervention,
    nextAttemptAt: null,
    suspendedSince: null,
    lastErrorCode: code,
    lastErrorDetail: detail,
  };
}

/** Pauses for a retry, or requires intervention when the suspension caps are exceeded. */
export function suspend(
  instance: SagaInstance,
  code: string,
  detail: string | null,
  now: Date,
  policy: SuspendPolicy,
): SagaInstance {
  const attempts = instance.attempts + 1;
  const since = instance.suspendedSince ?? now;
  const exhausted =
    attempts > policy.maxSuspendAttempts ||
    now.getTime() - since.getTime() >= policy.maxSuspendAgeMs;
  // The suspension start is kept even when giving up, so the instance shows
  // how long the step kept failing.
  return {
    ...instance,
    status: exhausted ? SagaStatus.RequiresIntervention : SagaStatus.Suspended,
    attempts,
    suspendedSince: since,
    nextAttemptAt: exhausted
      ? null
      : new Date(now.getTime() + policy.backoff(attempts)),
    lastErrorCode: code,
    lastErrorDetail: detail,
  };
}

/** Starts compensation from `from` (inclusive) downwards. Completes at once if nothing needs undoing. */
export function compensationStart(
  compiled: CompiledSaga<unknown>,
  instance: SagaInstance,
  steps: readonly StepLogEntry[],
  from: number,
  code: string,
  detail: string | null,
): SagaInstance {
  const next = compensableFrom(compiled, steps, from);
  return {
    ...instance,
    direction: StepDirection.Compensate,
    status: next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
    currentStep: next ?? instance.currentStep,
    attempts: 0,
    suspendedSince: null,
    nextAttemptAt: null,
    lastErrorCode: code,
    lastErrorDetail: detail,
  };
}

/** Moves to the next step to undo below `from`, keeping the error that started the compensation. */
export function nextCompensation(
  compiled: CompiledSaga<unknown>,
  instance: SagaInstance,
  steps: readonly StepLogEntry[],
  from: number,
): SagaInstance {
  const next = compensableFrom(compiled, steps, from);
  return {
    ...instance,
    status: next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
    currentStep: next ?? instance.currentStep,
    attempts: 0,
    suspendedSince: null,
    nextAttemptAt: null,
  };
}

/** Moves forward after a successful step, clearing the failure of earlier attempts. */
export function advanceTo(
  compiled: CompiledSaga<unknown>,
  instance: SagaInstance,
  index: number,
  state: unknown,
): SagaInstance {
  const next = index + 1;
  const done = next >= compiled.steps.length;
  return {
    ...instance,
    state,
    status: done ? SagaStatus.Completed : SagaStatus.Running,
    currentStep: done ? index : next,
    attempts: 0,
    suspendedSince: null,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorDetail: null,
  };
}

/** Whether the saga deadline has passed at `now`. */
export function deadlinePassed(instance: SagaInstance, now: Date): boolean {
  return (
    instance.deadlineAt !== null &&
    now.getTime() >= instance.deadlineAt.getTime()
  );
}

/** The log entry of a step in one direction, if any. */
export function findEntry(
  steps: readonly StepLogEntry[],
  stepIndex: number,
  direction: StepDirection,
): StepLogEntry | undefined {
  return steps.find(
    (entry) => entry.stepIndex === stepIndex && entry.direction === direction,
  );
}

/** Returns the log with `entry` in place of its predecessor, or appended when it is new. */
export function replaceEntry(
  steps: readonly StepLogEntry[],
  entry: StepLogEntry,
): StepLogEntry[] {
  const matches = (step: StepLogEntry): boolean =>
    step.stepIndex === entry.stepIndex && step.direction === entry.direction;
  return steps.some(matches)
    ? steps.map((step) => (matches(step) ? entry : step))
    : [...steps, entry];
}

/**
 * Largest index at or below `from` whose forward effect may need undoing.
 * Steps without compensation (read-only operations) have nothing to undo.
 */
export function compensableFrom(
  compiled: CompiledSaga<unknown>,
  steps: readonly StepLogEntry[],
  from: number,
): number | null {
  for (let index = from; index >= 0; index--) {
    if (compiled.steps[index]?.compensationOperationId === null) {
      continue;
    }
    const entry = findEntry(steps, index, StepDirection.Forward);
    if (
      entry?.status === StepStatus.Succeeded ||
      entry?.status === StepStatus.Dispatched ||
      entry?.status === StepStatus.Uncertain
    ) {
      return index;
    }
  }
  return null;
}

/** The view of a forward entry that compensation input builders receive. */
export function toForwardEntry(entry: StepLogEntry): ForwardEntry {
  return {
    input: entry.input,
    output: entry.output,
    idempotencyKey: entry.idempotencyKey,
    status: entry.status,
  };
}
