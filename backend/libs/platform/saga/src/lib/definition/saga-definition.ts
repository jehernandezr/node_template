import { CompiledSaga, SagaFlow } from './saga-flow.js';

/**
 * Base class of a saga. Subclasses declare a unique `type` and describe their
 * steps in `define`.
 */
export abstract class SagaDefinition<TState = unknown> {
  /** Unique name of the saga, stored with every instance. */
  abstract readonly type: string;

  /** Describes the steps of the saga. */
  protected abstract define(flow: SagaFlow<TState>): void;

  /** Runs `define` and validates the result. Throws `SagaError` when invalid. */
  build(): CompiledSaga<TState> {
    const flow = new SagaFlow<TState>();
    this.define(flow);
    return flow.compile(this.type);
  }
}
