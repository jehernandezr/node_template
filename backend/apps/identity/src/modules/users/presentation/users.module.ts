import { Module } from '@nestjs/common';
import { SagaModule } from '@platform/saga/nest';
import { ChangeUserStatus } from '../application/change-user-status.use-case.js';
import { ConfirmEmailChange } from '../application/confirm-email-change.use-case.js';
import { ConfirmEmailVerification } from '../application/confirm-email-verification.use-case.js';
import { DeleteAccountSaga } from '../application/delete-account.saga.js';
import { EraseUser } from '../application/erase-user.use-case.js';
import { RegisterUser } from '../application/register-user.use-case.js';
import { RequestEmailChange } from '../application/request-email-change.use-case.js';
import { ResendEmailVerification } from '../application/resend-email-verification.use-case.js';
import { StartAccountDeletion } from '../application/start-account-deletion.use-case.js';
import { SweepReservedLookupsJob } from '../application/sweep-reserved-lookups.job.js';
import { UpdateMyProfile } from '../application/update-my-profile.use-case.js';
import { EmailProofStore } from '../domain/email-proof-store.js';
import { EphemeralEmailProofStore } from '../infrastructure/ephemeral-email-proof-store.js';
import { UsersController } from './users.controller.js';
import { UsersInternalOperations } from './users.internal-operations.js';

import { UsersCoreModule } from './users-core.module.js';
import { AccessCoreModule } from '../../access/module.js';
import { AlertsModule } from '../../alerts/module.js';
import { AuthenticationModule } from '../../authentication/module.js';
import { DevicesCoreModule } from '../../devices/module.js';
import { InvitationsModule } from '../../invitations/module.js';
import { MfaModule } from '../../mfa/module.js';
import { PasskeysCoreModule } from '../../passkeys/module.js';
import { PasswordsCoreModule } from '../../passwords/module.js';
import { SagasModule } from '../../sagas/module.js';
import { SessionsModule } from '../../sessions/module.js';

/** Users, registration, email verification and change, profile, suspension and account deletion. */
@Module({
  imports: [
    UsersCoreModule,
    AccessCoreModule,
    AlertsModule,
    AuthenticationModule,
    DevicesCoreModule,
    InvitationsModule,
    MfaModule,
    PasskeysCoreModule,
    PasswordsCoreModule,
    SagasModule,
    SessionsModule,
    SagaModule.forFeature([DeleteAccountSaga]),
  ],
  controllers: [UsersController],
  providers: [
    { provide: EmailProofStore, useClass: EphemeralEmailProofStore },
    RegisterUser,
    ConfirmEmailVerification,
    ResendEmailVerification,
    UpdateMyProfile,
    RequestEmailChange,
    ConfirmEmailChange,
    ChangeUserStatus,
    EraseUser,
    StartAccountDeletion,
    SweepReservedLookupsJob,
    UsersInternalOperations,
  ],
})
export class UsersModule {}
