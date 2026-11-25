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
 * Identity pieces that `AuthModule` needs and that do not come from the platform: the access computed in
 * process, the `auth:*` writer, the signing keys identity uses to verify its own tokens and
 * the client IP used to check CIDR-restricted API keys.
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
