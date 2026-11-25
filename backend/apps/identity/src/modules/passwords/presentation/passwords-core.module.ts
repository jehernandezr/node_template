import { Module } from '@nestjs/common';
import { BloomModule } from '@platform/bloom/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LocalPasswordsFacade } from '../application/local-passwords.facade.js';
import { PasswordAcceptance } from '../application/password-acceptance.js';
import { PasswordVerifier } from '../application/password-verifier.js';
import { PasswordsFacade } from '../application/passwords.facade.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { PasswordCredentialRepository } from '../domain/password-credential.repository.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { PasswordResetRepository } from '../domain/password-reset.repository.js';
import { PasswordResetRetention } from '../domain/password-reset-retention.js';
import { PasswordResetEntity } from '../infrastructure/persistence/entities/password-reset.entity.js';
import { TypeOrmPasswordResetRepository } from '../infrastructure/persistence/typeorm-password-reset.repository.js';
import { TypeOrmPasswordResetRetention } from '../infrastructure/persistence/typeorm-password-reset-retention.js';
import { NodeArgon2idHasher } from '../infrastructure/node-argon2id-hasher.js';
import { PasswordCredentialEntity } from '../infrastructure/persistence/entities/password-credential.entity.js';
import { TypeOrmPasswordCredentialRepository } from '../infrastructure/persistence/typeorm-password-credential.repository.js';
import { BloomBreachedPasswordList } from '../infrastructure/bloom-breached-password-list.js';
import { KnownBreachedPasswordsSource } from '../infrastructure/known-breached-passwords-source.js';
import { BloomFilterName } from '../../../shared/enums/bloom-filter-name.enum.js';

/**
 * The part of `Passwords` other modules depend on: its facade and what the facade needs, with the repositories and services its entry module also uses.
 */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [PasswordCredentialEntity, PasswordResetEntity],
      sharding: { key: ShardKey.User },
    }),
    BloomModule.forFeature({
      definition: {
        name: BloomFilterName.BreachedPasswords,
        expectedItems: PasswordsCoreModule.BREACHED_PASSWORDS_CAPACITY,
        falsePositiveRate: 0.001,
        rebuildCron: '0 4 * * 0',
      },
      source: KnownBreachedPasswordsSource,
    }),
  ],
  providers: [
    {
      provide: PasswordCredentialRepository,
      useClass: TypeOrmPasswordCredentialRepository,
    },
    { provide: PasswordHasher, useClass: NodeArgon2idHasher },
    KnownBreachedPasswordsSource,
    { provide: BreachedPasswordList, useClass: BloomBreachedPasswordList },
    {
      provide: PasswordResetRepository,
      useClass: TypeOrmPasswordResetRepository,
    },
    {
      provide: PasswordResetRetention,
      useClass: TypeOrmPasswordResetRetention,
    },
    PasswordAcceptance,
    PasswordVerifier,
    { provide: PasswordsFacade, useClass: LocalPasswordsFacade },
  ],
  exports: [
    PasswordCredentialRepository,
    PasswordHasher,
    KnownBreachedPasswordsSource,
    BreachedPasswordList,
    PasswordResetRepository,
    PasswordResetRetention,
    PasswordAcceptance,
    PasswordVerifier,
    PasswordsFacade,
  ],
})
export class PasswordsCoreModule {
  /** Room above the starting list: the Have I Been Pwned list arrives through the same filter. */
  static readonly BREACHED_PASSWORDS_CAPACITY = 10_000;
}
