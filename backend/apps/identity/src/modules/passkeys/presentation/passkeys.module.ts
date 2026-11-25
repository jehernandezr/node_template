import { Module } from '@nestjs/common';
import { ManagePasskeys } from '../application/manage-passkeys.use-case.js';
import { PasskeyAuthentication } from '../application/passkey-authentication.use-case.js';
import { PasskeysController } from './passkeys.controller.js';

import { PasskeysCoreModule } from './passkeys-core.module.js';
import { DevicesCoreModule } from '../../devices/module.js';
import { MfaModule } from '../../mfa/module.js';
import { SessionsModule } from '../../sessions/module.js';
import { UsersCoreModule } from '../../users/module.js';

/** WebAuthn: registration, passwordless sign-in, second factor and step-up. */
@Module({
  imports: [
    PasskeysCoreModule,
    DevicesCoreModule,
    MfaModule,
    SessionsModule,
    UsersCoreModule,
  ],
  controllers: [PasskeysController],
  providers: [ManagePasskeys, PasskeyAuthentication],
})
export class PasskeysModule {}
