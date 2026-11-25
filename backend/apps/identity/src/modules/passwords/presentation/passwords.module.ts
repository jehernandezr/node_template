import { Module } from '@nestjs/common';
import { ChangePassword } from '../application/change-password.use-case.js';
import { ConfirmPasswordReset } from '../application/confirm-password-reset.use-case.js';
import { PurgePasswordResetsJob } from '../application/purge-password-resets.job.js';
import { RequestPasswordReset } from '../application/request-password-reset.use-case.js';
import { SendPasswordReset } from '../application/send-password-reset.use-case.js';
import { PasswordResetTokens } from '../application/password-reset-tokens.js';
import { PasswordResetsConsumer } from './password-resets.consumer.js';
import { PasswordsController } from './passwords.controller.js';

import { PasswordsCoreModule } from './passwords-core.module.js';
import { AlertsModule } from '../../alerts/module.js';
import { SessionsModule } from '../../sessions/module.js';
import { UsersCoreModule } from '../../users/module.js';

/** Passwords: hash, policy, change and reset. */
@Module({
  imports: [PasswordsCoreModule, AlertsModule, SessionsModule, UsersCoreModule],
  controllers: [PasswordsController],
  providers: [
    PurgePasswordResetsJob,
    PasswordResetTokens,
    ChangePassword,
    RequestPasswordReset,
    SendPasswordReset,
    PasswordResetsConsumer,
    ConfirmPasswordReset,
  ],
})
export class PasswordsModule {}
