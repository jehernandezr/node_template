import type { SagaInstance } from '../model/saga-instance.js';

/**
 * Corre el trabajo de una saga en el contexto de la partición donde vive. Con
 * shards, el adaptador de Postgres entrega una versión que fija el shard del
 * tenant de la saga; el job de recuperación la usa porque no hay petición que dé el tenant.
 */
export abstract class SagaScopes {
  /** Corre `body` en la partición de `instance`. */
  abstract run<T>(instance: SagaInstance, body: () => Promise<T>): Promise<T>;
}
