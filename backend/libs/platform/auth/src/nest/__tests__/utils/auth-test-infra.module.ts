import { Global, Module } from '@nestjs/common';
import { FakeAccessGrantSource } from '../../../__tests__/utils/fake-access-grant-source.js';
import { FakeApiKeyResolver } from '../../../__tests__/utils/fake-api-key-resolver.js';
import { InMemoryAuthState } from '../../../__tests__/utils/in-memory-auth-state.js';
import { StaticJwksKeySource } from '../../../jwks/static-jwks-key-source.js';

/** Llaves de verificación vacías: basta para que el módulo compile. */
export class StaticKeys extends StaticJwksKeySource {
  constructor() {
    super(new Map());
  }
}

/**
 * Módulo global de dobles que hace el papel de `ValkeyModule` en un servicio real:
 * expone el estado, el aviso de revocaciones y la fuente de grants.
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
