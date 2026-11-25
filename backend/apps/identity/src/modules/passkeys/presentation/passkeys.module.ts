import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LocalPasskeysFacade } from '../application/local-passkeys.facade.js';
import { ManagePasskeys } from '../application/manage-passkeys.use-case.js';
import { PasskeyAuthentication } from '../application/passkey-authentication.use-case.js';
import { PasskeyCeremony } from '../application/passkey-ceremony.js';
import { PasskeysFacade } from '../application/passkeys.facade.js';
import {
  PasskeyDirectory,
  PasskeyRepository,
} from '../domain/passkey-store.js';
import { WebAuthnChallengeStore } from '../domain/webauthn-challenge-store.js';
import { WebAuthnVerifier } from '../domain/webauthn-verifier.js';
import { EphemeralWebAuthnChallengeStore } from '../infrastructure/ephemeral-webauthn-challenge-store.js';
import { PasskeyLookupEntity } from '../infrastructure/persistence/entities/passkey-lookup.entity.js';
import { PasskeyEntity } from '../infrastructure/persistence/entities/passkey.entity.js';
import { TypeOrmPasskeyDirectory } from '../infrastructure/persistence/typeorm-passkey-directory.js';
import { TypeOrmPasskeyRepository } from '../infrastructure/persistence/typeorm-passkey.repository.js';
import { SimpleWebAuthnVerifier } from '../infrastructure/simple-webauthn-verifier.js';
import { PasskeysController } from './passkeys.controller.js';

/** WebAuthn: registration, passwordless sign-in, second factor and step-up. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [PasskeyEntity],
      sharding: { key: ShardKey.User },
    }),
    PersistenceModule.forFeature({
      entities: [PasskeyLookupEntity],
      catalog: true,
    }),
  ],
  controllers: [PasskeysController],
  providers: [
    { provide: PasskeyRepository, useClass: TypeOrmPasskeyRepository },
    { provide: PasskeyDirectory, useClass: TypeOrmPasskeyDirectory },
    {
      provide: WebAuthnChallengeStore,
      useClass: EphemeralWebAuthnChallengeStore,
    },
    { provide: WebAuthnVerifier, useClass: SimpleWebAuthnVerifier },
    PasskeyCeremony,
    ManagePasskeys,
    PasskeyAuthentication,
    { provide: PasskeysFacade, useClass: LocalPasskeysFacade },
  ],
  exports: [PasskeysFacade],
})
export class PasskeysModule {}
