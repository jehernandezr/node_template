import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';
import type { SagaFlow } from './saga-flow.js';
import type { StepDraft } from './step-draft.js';
import type { StepInputOf, StepOutputOf } from './step-types.js';

/**
 * Configures a step. The methods return the same object, so the chain
 * continues with `.step()`, `.pivot()` or the next configuration call.
 */
export class StepConfig<TState, TIn, TOut> {
  constructor(
    private readonly flow: SagaFlow<TState>,
    private readonly draft: StepDraft<TState>,
  ) {}

  /**
   * Builds this step's input from the saga state. Defaults to `undefined`.
   * @param fn Input builder.
   * @returns The step config.
   */
  input(fn: (state: TState) => TIn): this {
    this.draft.input = fn;
    return this;
  }

  /**
   * Applies this step's output to the saga state. Receives a normalized copy.
   * The engine delivers the JSON-normalized output that the invoker produced.
   * @param fn Output applier.
   * @returns The step config.
   */
  onSuccess(fn: (state: TState, output: TOut) => void): this {
    this.draft.onSuccess = fn as (state: TState, output: unknown) => void;
    return this;
  }

  /**
   * Builds the compensation input. Defaults to the input recorded going forward.
   * @param fn Compensation input builder.
   * @returns The step config.
   */
  compensationInput(
    fn: (state: TState, forward: ForwardEntry) => unknown,
  ): this {
    this.draft.compensationInput = fn;
    return this;
  }

  /**
   * `transient-failure` reasons that say the participant made progress and asks for another call, like a copy round
   * that did not fit in its deadline. The step is repeated without spending the suspensions, which are kept for real failures; before
   * the pivot it is bounded by the saga deadline.
   * @param reasons Progress reasons.
   * @returns The step config.
   */
  progressOn(...reasons: readonly string[]): this {
    this.draft.progressReasons = reasons;
    return this;
  }

  /**
   * Adds the next step, which calls a contract's operation.
   * @param operation Operation contract.
   * @returns The next step config.
   */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>> {
    return this.flow.step(operation);
  }

  /**
   * Marks the boundary: steps added afterwards are never compensated.
   * @returns The step config.
   */
  pivot(): this {
    this.flow.markPivot();
    return this;
  }
}
