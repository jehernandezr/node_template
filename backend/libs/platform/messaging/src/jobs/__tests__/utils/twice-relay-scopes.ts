import { RelayScopes } from '../../../relay/relay-scopes.js';

/** Recorridos de particiones que corren el cuerpo dos veces, para probar que una segunda pasada no duplica. */
export class TwiceRelayScopes extends RelayScopes {
  async forEach(body: () => Promise<void>): Promise<void> {
    await body();
    await body();
  }
}
