import type { SagaDefinitionClass } from '../definition/saga-definition-class.js';
import type { SagaRegistry } from '../definition/saga-registry.js';
import type { SagaInstance } from '../model/saga-instance.js';
import type { SagaEngine } from './saga-engine.js';
import type { StartOptions } from './start-options.js';

/**
 * Lo que un caso de uso inyecta para arrancar una saga por su clase:
 * `await this.sagas.start(CreateTenantSaga, state, { idempotencyKey })`.
 */
export class Sagas {
  constructor(
    private readonly engine: SagaEngine,
    private readonly registry: SagaRegistry,
  ) {}

  /**
   * Arranca la saga de `definition` con `state` y la corre hasta que se pause o termine.
   * @throws SagaError `UnknownDefinition` si la clase no está registrada con `SagaModule.forFeature`.
   */
  start<TState>(
    definition: SagaDefinitionClass<TState>,
    state: TState,
    options?: StartOptions,
  ): Promise<SagaInstance> {
    return this.engine.start(this.registry.typeOf(definition), state, options);
  }
}
