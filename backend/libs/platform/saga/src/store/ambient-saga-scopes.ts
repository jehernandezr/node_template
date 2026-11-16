import type { SagaInstance } from '../model/saga-instance.js';
import { SagaScopes } from './saga-scopes.js';

/** Una sola base: `body` corre tal cual, sin cambiar de partición. */
export class AmbientSagaScopes extends SagaScopes {
  run<T>(_instance: SagaInstance, body: () => Promise<T>): Promise<T> {
    return body();
  }
}
