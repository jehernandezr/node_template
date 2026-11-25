import { Global, Module } from '@nestjs/common';
import { FakeAccessGrantSource } from '../../../__tests__/utils/fake-access-grant-source.js';
import { FakeApiKeyResolver } from '../../../__tests__/utils/fake-api-key-resolver.js';
import { InMemoryAuthState } from '../../../__tests__/utils/in-memory-auth-state.js';
import { StaticJwksKeySource } from '../../../jwks/static-jwks-key-source.js';

/** Empty verification keys: enough for the module to compile. */
export class StaticKeys extends StaticJwksKeySource {
  constructor() {
    super(new Map());
  }
}

/**
 * Global module of doubles that plays the role of `ValkeyModule` in a real service:
 * exposes the state, the revocation notices and the grant source.
 */
@Global()
@Module({
  providers: [
    InMemoryAuthState,
    FakeAccessGrantSource,
    FakeApiKeyResolver,
    StaticKeys,
  ],
  exports: [
    InMemoryAuthState,
    FakeAccessGrantSource,
    FakeApiKeyResolver,
    StaticKeys,
  ],
})
export class AuthTestInfra {}
