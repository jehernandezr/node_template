import {
  Module,
  RequestMethod,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { AuthModule } from '@platform/auth/nest';
import {
  ValkeyAuthRevocationFeed,
  ValkeyAuthStateReader,
} from '@platform/adapters-valkey';
import { IdentityApiKeyResolver } from '../modules/api-keys/index.js';
import { SigningKeyJwksSource } from '../modules/tokens/index.js';
import { AccessFacadeGrantSource } from './access-facade-grant-source.js';
import { ClientIpMiddleware } from './client-ip.middleware.js';
import { IdentityAuthSupportModule } from './identity-auth-support.module.js';

/**
 * Verificación de tokens y actor de identity. Identity verifica sus propios tokens con sus claves de firma,
 * sin descargar su JWKS, y resuelve las API keys con `api-keys` dentro del proceso.
 */
@Module({
  imports: [
    IdentityAuthSupportModule,
    AuthModule.forRoot({
      source: ValkeyAuthStateReader,
      feed: ValkeyAuthRevocationFeed,
      accessGrants: AccessFacadeGrantSource,
      jwks: SigningKeyJwksSource,
      apiKeyResolver: IdentityApiKeyResolver,
    }),
  ],
})
export class IdentityAuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ClientIpMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
