import type { OperationResolver } from '@platform/internal-api';
import type { CompiledSaga } from './compiled-saga.js';
import { SagaFlow } from './saga-flow.js';

/**
 * Base class of a saga. Subclasses declare a unique `type` and describe
 * their steps in `define`. A concrete subclass is the identifier with which
 * a use case starts the saga (`Sagas.start(CreateTenantSaga, ...)`).
 */
export abstract class SagaDefinition<TState = unknown> {
  /** Unique name of the saga, stored with each instance. */
  abstract readonly type: string;

  /** Describes the saga's steps. */
  protected abstract define(flow: SagaFlow<TState>): void;

  /** Runs `define` and validates the result. Throws `SagaError` if it is invalid. */
  build(resolver: OperationResolver): CompiledSaga<TState> {
    const flow = new SagaFlow<TState>(resolver);
    this.define(flow);
    return flow.compile(this.type);
  }
}
