import type { SagaDefinitionClass } from '../definition/saga-definition-class.js';
import type { SagaRegistry } from '../definition/saga-registry.js';
import type { SagaInstance } from '../model/saga-instance.js';
import type { SagaEngine } from './saga-engine.js';
import type { StartOptions } from './start-options.js';

/**
 * What a use case injects to start a saga by its class:
 * `await this.sagas.start(CreateTenantSaga, state, { idempotencyKey })`.
 */
export class Sagas {
  constructor(
    private readonly engine: SagaEngine,
    private readonly registry: SagaRegistry,
  ) {}

  /**
   * Starts the `definition` saga with `state` and runs it until it pauses or finishes.
   * @throws SagaError `UnknownDefinition` if the class is not registered with `SagaModule.forFeature`.
   */
  start<TState>(
    definition: SagaDefinitionClass<TState>,
    state: TState,
    options?: StartOptions,
  ): Promise<SagaInstance> {
    return this.engine.start(this.registry.typeOf(definition), state, options);
  }
}
