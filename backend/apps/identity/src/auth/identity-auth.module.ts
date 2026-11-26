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
import { IdentityAccessGrantsModule } from './identity-access-grants.module.js';
import { IdentityAuthSupportModule } from './identity-auth-support.module.js';

/**
 * Token verification and the identity actor. Identity verifies its own tokens with its signing keys,
 * without downloading its JWKS, and resolves API keys with `api-keys` in process.
 */
@Module({
  imports: [
    IdentityAuthSupportModule,
    AuthModule.forRootAsync({
      imports: [IdentityAccessGrantsModule],
      useFactory: () => ({}),
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
