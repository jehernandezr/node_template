import { Global, Module } from '@nestjs/common';
import { RandomSource } from '@platform/kernel';
import { IdentitySettings } from '../config/identity-settings.js';
import { HmacSecretHasher } from './hmac-secret-hasher.js';
import { SecretGenerator } from './secret-generator.js';
import { SecretHasher } from './secret-hasher.js';

/** Hashes and random secrets shared by identity's modules. */
@Global()
@Module({
  providers: [
    IdentitySettings,
    {
      provide: SecretHasher,
      useFactory: (settings: IdentitySettings) =>
        new HmacSecretHasher(settings.values.IDENTITY_TOKEN_PEPPER.reveal()),
      inject: [IdentitySettings],
    },
    {
      provide: SecretGenerator,
      useFactory: (random: RandomSource) => new SecretGenerator(random),
      inject: [RandomSource],
    },
  ],
  exports: [IdentitySettings, SecretHasher, SecretGenerator],
})
export class IdentitySecurityModule {}
