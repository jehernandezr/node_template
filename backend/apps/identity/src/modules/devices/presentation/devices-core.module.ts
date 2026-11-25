import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { DeviceRegistry } from '../application/device-registry.js';
import { DevicesFacade } from '../application/devices.facade.js';
import { LocalDevicesFacade } from '../application/local-devices.facade.js';
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
import { AlertsModule } from '../../alerts/module.js';

/**
 * The part of `Devices` other modules depend on: its facade and what the facade needs, with the repositories and services its entry module also uses.
 */
@Module({
  imports: [
    AlertsModule,
    PersistenceModule.forFeature({
      entities: [DeviceEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  providers: [
    { provide: DeviceRepository, useClass: TypeOrmDeviceRepository },
    { provide: DeviceApprovalStore, useClass: EphemeralDeviceApprovalStore },
    { provide: DeviceSignatureVerifier, useClass: NodeDeviceSignatureVerifier },
    { provide: PushNotifier, useClass: LoggingPushNotifier },
    DeviceRegistry,
    SignedDeviceRequest,
    { provide: DevicesFacade, useClass: LocalDevicesFacade },
  ],
  exports: [
    DeviceRepository,
    DeviceApprovalStore,
    DeviceSignatureVerifier,
    PushNotifier,
    DeviceRegistry,
    SignedDeviceRequest,
    DevicesFacade,
  ],
})
export class DevicesCoreModule {}
