import { Module } from '@nestjs/common';
import { AuthModule } from '@platform/auth/nest';
import {
  ValkeyAuthRevocationFeed,
  ValkeyAuthStateReader,
} from '@platform/adapters-valkey';
import { AccessFacadeGrantSource } from './access-facade-grant-source.js';
import { IdentityAuthSupportModule } from './identity-auth-support.module.js';

/**
 * Verificación de tokens y actor de identity. Sin `apiKeyResolver` ninguna API key es válida hasta que
 * `api-keys` lo conecte; las claves de verificación se descargan de `AUTH_JWKS_URL`.
 */
@Module({
  imports: [
    IdentityAuthSupportModule,
    AuthModule.forRoot({
      source: ValkeyAuthStateReader,
      feed: ValkeyAuthRevocationFeed,
      accessGrants: AccessFacadeGrantSource,
    }),
  ],
})
export class IdentityAuthModule {}
