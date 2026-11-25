import type { OperationDefinition } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import type { CallMeta } from '../../../transport/call-meta.js';
import type {
  HandlerInputOf,
  OperationOutputOf,
} from '../../../contract/operation-io.type.js';
import type { HandlerResult } from '../../handler-result.js';
import { OperationHandler } from '../../operation-handler.js';

/** A programmed step: returns a value or throws, and can wait on a gate first. */
interface ScriptedStep {
  readonly throws: boolean;
  readonly value?: unknown;
  readonly error?: unknown;
  readonly gate?: Promise<void>;
}

/**
 * Test handler with programmed steps in order; the last one repeats. It counts
 * the calls and stores the input and the `CallMeta` of each one. The returned
 * value is not validated here: this way a test can program a malformed
 * result on purpose.
 */
export class ScriptedHandler<
  S extends OperationDefinition = OperationDefinition,
> extends OperationHandler<S> {
  calls = 0;
  readonly inputs: unknown[] = [];
  readonly contexts: CallMeta[] = [];
  private readonly steps: ScriptedStep[] = [];

  /** Programs a result; `gate`, if given, holds the step until it resolves. */
  thenReturn(result: unknown, gate?: Promise<void>): this {
    this.steps.push({ throws: false, value: result, gate });
    return this;
  }

  /** Queues a step that throws `error`. */
  thenThrow(error: unknown): this {
    this.steps.push({ throws: true, error });
    return this;
  }

  override async handle(
    input: HandlerInputOf<S>,
    context: CallMeta,
  ): Promise<HandlerResult<OperationOutputOf<S>>> {
    this.calls += 1;
    this.inputs.push(input);
    this.contexts.push(context);
    const step: ScriptedStep | undefined =
      this.steps[Math.min(this.calls, this.steps.length) - 1];
    if (step?.gate !== undefined) {
      await step.gate;
    }
    if (step?.throws === true) {
      throw step.error;
    }
    const result: unknown = step?.value ?? { outcome: CallOutcome.success({}) };
    return result as HandlerResult<OperationOutputOf<S>>;
  }
}
