import {
  CallOutcome,
  CallOutcomeKind,
  type Deadline,
  raceDeadline,
  RaceStop,
} from '@platform/primitives';
import type { OperationInvoker } from '../invoker.js';
import type { SagaCallContext } from '../model.js';
import { assertSerializableState, jsonClone } from '../util.js';
import { errorDetail } from './transitions.js';

/** Reason of the protocol violation for an invoker result that is not a `CallOutcome`. */
export const INVALID_INVOKER_RESULT = 'invalid-invoker-result';

const OUTCOME_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(CallOutcomeKind),
);

/** One call of a step. */
export interface StepCall {
  readonly operationId: string;
  readonly input: unknown;
  readonly idempotencyKey: string;
  readonly deadline: Deadline;
  readonly context: SagaCallContext;
}

/**
 * Calls the operation until the step deadline. When it runs out, the call's
 * signal aborts and the outcome is `uncertain`: the callee may have applied
 * it. A thrown error is classified with `classifyFailure`, and a result that
 * is not a `CallOutcome` (a broken invoker written in plain JavaScript, for
 * example) is a protocol violation rather than a crash of the engine.
 */
export async function invokeStep(
  invoker: OperationInvoker,
  call: StepCall,
  budgetMs: number,
): Promise<CallOutcome<unknown>> {
  try {
    const result = await raceDeadline(
      (signal) =>
        invoker.invoke(call.operationId, call.input, call.idempotencyKey, {
          signal,
          deadline: call.deadline,
          context: call.context,
        }),
      { deadline: call.deadline },
    );
    if (!result.settled) {
      return CallOutcome.uncertain(
        result.stop === RaceStop.Timeout
          ? `timed out after ${budgetMs} ms`
          : 'cancelled',
      );
    }
    return checkedOutcome(result.value);
  } catch (error) {
    return CallOutcome.fromError(error);
  }
}

function checkedOutcome(result: unknown): CallOutcome<unknown> {
  const kind =
    typeof result === 'object' && result !== null
      ? (result as { kind?: unknown }).kind
      : undefined;
  return OUTCOME_KINDS.has(kind)
    ? (result as CallOutcome<unknown>)
    : CallOutcome.protocolViolation(INVALID_INVOKER_RESULT);
}

/** A value built by service code, or why it could not be built. */
export type Built =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown; readonly detail: string };

/** Builds a value and checks that it survives the store (JSON) with its shape intact. */
export function buildSerializable(build: () => unknown): Built {
  try {
    const value = build();
    assertSerializableState(value);
    return { ok: true, value: jsonClone(value) };
  } catch (error) {
    return { ok: false, error, detail: errorDetail(error) };
  }
}
