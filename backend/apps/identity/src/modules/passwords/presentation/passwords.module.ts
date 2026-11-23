import { Global, Module } from '@nestjs/common';
import { BloomModule } from '@platform/bloom/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ChangePassword } from '../application/change-password.use-case.js';
import { ConfirmPasswordReset } from '../application/confirm-password-reset.use-case.js';
import { LocalPasswordsFacade } from '../application/local-passwords.facade.js';
import { PasswordAcceptance } from '../application/password-acceptance.js';
import { PasswordVerifier } from '../application/password-verifier.js';
import { PasswordsFacade } from '../application/passwords.facade.js';
import { PurgePasswordResetsJob } from '../application/purge-password-resets.job.js';
import { RequestPasswordReset } from '../application/request-password-reset.use-case.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { PasswordCredentialRepository } from '../domain/password-credential.repository.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { PasswordResetRepository } from '../domain/password-reset.repository.js';
import { PasswordResetRetention } from '../domain/password-reset-retention.js';
import { PasswordResetTokens } from '../application/password-reset-tokens.js';
import { PasswordResetEntity } from '../infrastructure/persistence/entities/password-reset.entity.js';
import { TypeOrmPasswordResetRepository } from '../infrastructure/persistence/typeorm-password-reset.repository.js';
import { TypeOrmPasswordResetRetention } from '../infrastructure/persistence/typeorm-password-reset-retention.js';
import { NodeArgon2idHasher } from '../infrastructure/node-argon2id-hasher.js';
import { PasswordCredentialEntity } from '../infrastructure/persistence/entities/password-credential.entity.js';
import { TypeOrmPasswordCredentialRepository } from '../infrastructure/persistence/typeorm-password-credential.repository.js';
import { BloomBreachedPasswordList } from '../infrastructure/bloom-breached-password-list.js';
import { KnownBreachedPasswordsSource } from '../infrastructure/known-breached-passwords-source.js';
import { BloomFilterName } from '../../../shared/enums/bloom-filter-name.enum.js';
import { PasswordsController } from './passwords.controller.js';

/** Contraseñas: hash, política, cambio y recuperación. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [PasswordCredentialEntity, PasswordResetEntity],
      sharding: { key: ShardKey.User },
    }),
    BloomModule.forFeature({
      definition: {
        name: BloomFilterName.BreachedPasswords,
        expectedItems: PasswordsModule.BREACHED_PASSWORDS_CAPACITY,
        // Un falso positivo rechaza una contraseña buena: con 1 en 1000 casi nadie lo nota.
        falsePositiveRate: 0.001,
        rebuildCron: '0 4 * * 0',
      },
      source: KnownBreachedPasswordsSource,
    }),
  ],
  controllers: [PasswordsController],
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
    PurgePasswordResetsJob,
    PasswordResetTokens,
    PasswordAcceptance,
    PasswordVerifier,
    ChangePassword,
    RequestPasswordReset,
    ConfirmPasswordReset,
    { provide: PasswordsFacade, useClass: LocalPasswordsFacade },
  ],
  exports: [PasswordsFacade],
})
export class PasswordsModule {
  /** Holgura sobre la lista de arranque: la de Have I Been Pwned llega por el mismo filtro. */
  static readonly BREACHED_PASSWORDS_CAPACITY = 10_000;
}
