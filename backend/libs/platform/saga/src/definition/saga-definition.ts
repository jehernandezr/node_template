import type { OperationResolver } from '@platform/internal-api';
import type { CompiledSaga } from './compiled-saga.js';
import { SagaFlow } from './saga-flow.js';

/**
 * Clase base de una saga. Las subclases declaran un `type` único y describen
 * sus pasos en `define`. Una subclase concreta es el identificador con el que
 * un caso de uso arranca la saga (`Sagas.start(CreateTenantSaga, ...)`).
 */
export abstract class SagaDefinition<TState = unknown> {
  /** Nombre único de la saga, guardado con cada instancia. */
  abstract readonly type: string;

  /** Describe los pasos de la saga. */
  protected abstract define(flow: SagaFlow<TState>): void;

  /** Corre `define` y valida el resultado. Lanza `SagaError` si es inválida. */
  build(resolver: OperationResolver): CompiledSaga<TState> {
    const flow = new SagaFlow<TState>(resolver);
    this.define(flow);
    return flow.compile(this.type);
  }
}
