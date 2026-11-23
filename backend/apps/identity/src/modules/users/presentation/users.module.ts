import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { SagaModule } from '@platform/saga/nest';
import { ShardKey } from '@platform/sharding';
import { ChangeUserStatus } from '../application/change-user-status.use-case.js';
import { ConfirmEmailChange } from '../application/confirm-email-change.use-case.js';
import { ConfirmEmailVerification } from '../application/confirm-email-verification.use-case.js';
import { DeleteAccountSaga } from '../application/delete-account.saga.js';
import { EraseUser } from '../application/erase-user.use-case.js';
import { LocalUsersFacade } from '../application/local-users.facade.js';
import { RegisterUser } from '../application/register-user.use-case.js';
import { RequestEmailChange } from '../application/request-email-change.use-case.js';
import { ResendEmailVerification } from '../application/resend-email-verification.use-case.js';
import { SetLastTenant } from '../application/set-last-tenant.use-case.js';
import { StartAccountDeletion } from '../application/start-account-deletion.use-case.js';
import { SweepReservedLookupsJob } from '../application/sweep-reserved-lookups.job.js';
import { UpdateMyProfile } from '../application/update-my-profile.use-case.js';
import { UserReader } from '../application/user-reader.js';
import { UserRegistrar } from '../application/user-registrar.js';
import { UsersFacade } from '../application/users.facade.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';
import { EmailProofStore } from '../domain/email-proof-store.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';
import { EphemeralEmailProofStore } from '../infrastructure/ephemeral-email-proof-store.js';
import { HmacEmailFingerprinter } from '../infrastructure/hmac-email-fingerprinter.js';
import { IdentityLookupEntity } from '../infrastructure/persistence/entities/identity-lookup.entity.js';
import { UserEntity } from '../infrastructure/persistence/entities/user.entity.js';
import { TypeOrmUserDirectory } from '../infrastructure/persistence/typeorm-user-directory.js';
import { TypeOrmUserRepository } from '../infrastructure/persistence/typeorm-user.repository.js';
import { UsersController } from './users.controller.js';
import { UsersInternalOperations } from './users.internal-operations.js';

/** Usuarios, registro, verificación y cambio de email, perfil, suspensión y borrado de cuenta. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [UserEntity],
      sharding: { key: ShardKey.User },
    }),
    PersistenceModule.forFeature({
      entities: [IdentityLookupEntity],
      catalog: true,
    }),
    SagaModule.forFeature([DeleteAccountSaga]),
  ],
  controllers: [UsersController],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: UserDirectory, useClass: TypeOrmUserDirectory },
    { provide: EmailFingerprinter, useClass: HmacEmailFingerprinter },
    { provide: EmailProofStore, useClass: EphemeralEmailProofStore },
    UserReader,
    UserRegistrar,
    RegisterUser,
    ConfirmEmailVerification,
    ResendEmailVerification,
    UpdateMyProfile,
    RequestEmailChange,
    ConfirmEmailChange,
    ChangeUserStatus,
    EraseUser,
    StartAccountDeletion,
    SetLastTenant,
    SweepReservedLookupsJob,
    { provide: UsersFacade, useClass: LocalUsersFacade },
    UsersInternalOperations,
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
