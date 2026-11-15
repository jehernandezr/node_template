import { RelayScopes } from './relay-scopes.js';

/** Una sola base: `body` corre una vez, sin contexto de partición. */
export class SingleRelayScope extends RelayScopes {
  async forEach(body: () => Promise<void>): Promise<void> {
    await body();
  }
}
