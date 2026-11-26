import { RelayScopes } from './relay-scopes.js';

/** A single database: `body` runs once, without a partition context. */
export class SingleRelayScope extends RelayScopes {
  override async forEach(body: () => Promise<void>): Promise<void> {
    await body();
  }
}
