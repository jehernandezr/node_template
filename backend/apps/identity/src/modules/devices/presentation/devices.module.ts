import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { DeviceApprovalsUseCase } from '../application/device-approvals.use-case.js';
import { DeviceRegistry } from '../application/device-registry.js';
import { DevicesFacade } from '../application/devices.facade.js';
import { ListPushTargets } from '../application/list-push-targets.use-case.js';
import { LocalDevicesFacade } from '../application/local-devices.facade.js';
import { ManageMyDevices } from '../application/manage-my-devices.use-case.js';
import { SignedDeviceRequest } from '../application/signed-device-request.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';
import { DeviceRepository } from '../domain/device.repository.js';
import { DeviceSignatureVerifier } from '../domain/device-signature-verifier.js';
import { PushNotifier } from '../domain/push-notifier.js';
import { EphemeralDeviceApprovalStore } from '../infrastructure/ephemeral-device-approval-store.js';
import { LoggingPushNotifier } from '../infrastructure/logging-push-notifier.js';
import { NodeDeviceSignatureVerifier } from '../infrastructure/node-device-signature-verifier.js';
import { DeviceEntity } from '../infrastructure/persistence/entities/device.entity.js';
import { TypeOrmDeviceRepository } from '../infrastructure/persistence/typeorm-device.repository.js';
import { DevicesController } from './devices.controller.js';
import { DevicesInternalOperations } from './devices.internal-operations.js';

/** Devices, their key, their approvals and their push. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [DeviceEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [DevicesController],
  providers: [
    { provide: DeviceRepository, useClass: TypeOrmDeviceRepository },
    { provide: DeviceApprovalStore, useClass: EphemeralDeviceApprovalStore },
    { provide: DeviceSignatureVerifier, useClass: NodeDeviceSignatureVerifier },
    { provide: PushNotifier, useClass: LoggingPushNotifier },
    DeviceRegistry,
    SignedDeviceRequest,
    ManageMyDevices,
    DeviceApprovalsUseCase,
    ListPushTargets,
    { provide: DevicesFacade, useClass: LocalDevicesFacade },
    DevicesInternalOperations,
  ],
  exports: [DevicesFacade, DeviceRegistry],
})
export class DevicesModule {}
