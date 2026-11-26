import { RelayScopes } from '../../../relay/relay-scopes.js';

/** Partition traversals that run the body twice, to test that a second pass does not duplicate. */
export class TwiceRelayScopes extends RelayScopes {
  override async forEach(body: () => Promise<void>): Promise<void> {
    await body();
    await body();
  }
}
