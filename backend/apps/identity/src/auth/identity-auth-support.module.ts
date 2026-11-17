import { Global, Module } from '@nestjs/common';
import { AuthStateWriter } from '@platform/auth';
import { ValkeyAuthStateWriter } from '@platform/adapters-valkey';
import { IdentitySettings } from '../config/identity-settings.js';
import {
  ConfigSigningKeyProvider,
  SigningKeyJwksSource,
  SigningKeyProvider,
} from '../modules/tokens/index.js';
import { AccessFacadeGrantSource } from './access-facade-grant-source.js';
import { ClientIpContext } from './client-ip-context.js';

/**
 * Piezas de identity que `AuthModule` necesita y que no vienen de la plataforma: el acceso calculado en el
 * proceso, el escritor de `auth:*`, las claves de firma con las que identity verifica sus propios tokens y
 * la IP del cliente con la que se revisan las API keys limitadas por CIDR.
 */
@Global()
@Module({
  providers: [
    AccessFacadeGrantSource,
    ClientIpContext,
    { provide: AuthStateWriter, useExisting: ValkeyAuthStateWriter },
    IdentitySettings,
    {
      provide: SigningKeyProvider,
      useFactory: (settings: IdentitySettings) =>
        new ConfigSigningKeyProvider(
          settings.values.IDENTITY_SIGNING_KEYS.reveal(),
        ),
      inject: [IdentitySettings],
    },
    {
      provide: SigningKeyJwksSource,
      useFactory: (keys: SigningKeyProvider) => new SigningKeyJwksSource(keys),
      inject: [SigningKeyProvider],
    },
  ],
  exports: [
    AccessFacadeGrantSource,
    ClientIpContext,
    AuthStateWriter,
    SigningKeyProvider,
    SigningKeyJwksSource,
  ],
})
export class IdentityAuthSupportModule {}
