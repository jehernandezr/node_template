import type { SagaInstance } from '../model/saga-instance.js';
import { SagaScopes } from './saga-scopes.js';

/** A single database: `body` runs as is, without switching partitions. */
export class AmbientSagaScopes extends SagaScopes {
  override run<T>(_instance: SagaInstance, body: () => Promise<T>): Promise<T> {
    return body();
  }
}
