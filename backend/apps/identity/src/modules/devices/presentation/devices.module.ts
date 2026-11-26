import { Module } from '@nestjs/common';
import { DeviceApprovalsUseCase } from '../application/device-approvals.use-case.js';
import { ListPushTargets } from '../application/list-push-targets.use-case.js';
import { ManageMyDevices } from '../application/manage-my-devices.use-case.js';
import { DevicesController } from './devices.controller.js';
import { DevicesInternalOperations } from './devices.internal-operations.js';

import { DevicesCoreModule } from './devices-core.module.js';
import { AlertsModule } from '../../alerts/module.js';
import { AuthenticationModule } from '../../authentication/module.js';
import { MfaModule } from '../../mfa/module.js';
import { SessionsModule } from '../../sessions/module.js';
import { UsersCoreModule } from '../../users/module.js';

/** Devices, their key, their approvals and their push. */
@Module({
  imports: [
    DevicesCoreModule,
    AlertsModule,
    AuthenticationModule,
    MfaModule,
    SessionsModule,
    UsersCoreModule,
  ],
  controllers: [DevicesController],
  providers: [
    ManageMyDevices,
    DeviceApprovalsUseCase,
    ListPushTargets,
    DevicesInternalOperations,
  ],
})
export class DevicesModule {}
