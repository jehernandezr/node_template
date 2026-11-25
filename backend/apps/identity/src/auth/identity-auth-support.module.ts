import { Global, Module } from '@nestjs/common';
import { AuthStateWriter } from '@platform/auth';
import { ValkeyAuthStateWriter } from '@platform/adapters-valkey';
import { IdentitySettings } from '../config/identity-settings.js';
import {
  ConfigSigningKeyProvider,
  SigningKeyJwksSource,
  SigningKeyProvider,
} from '../modules/tokens/index.js';
import { ClientIpContext } from './client-ip-context.js';

/**
 * Identity infrastructure that `AuthModule` and the business modules share: the `auth:*` writer, the signing keys
 * identity uses to verify its own tokens and the client IP used to check CIDR-restricted API keys. It holds no business
 * rules, so it is global like the platform modules.
 */
@Global()
@Module({
  providers: [
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
    ClientIpContext,
    AuthStateWriter,
    SigningKeyProvider,
    SigningKeyJwksSource,
  ],
})
export class IdentityAuthSupportModule {}
