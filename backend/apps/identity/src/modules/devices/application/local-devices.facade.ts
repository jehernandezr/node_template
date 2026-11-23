import { Injectable } from '@nestjs/common';
import type { DeviceApproval } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import { DeviceRoute } from '../domain/device-route.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';
import { DeviceRegistry } from './device-registry.js';
import { DevicesFacade } from './devices.facade.js';

/** `DevicesFacade` dentro del proceso. */
@Injectable()
export class LocalDevicesFacade extends DevicesFacade {
  constructor(private readonly registry: DeviceRegistry) {
    super();
  }

  recognize(ref: UserRef, deviceIdToken?: string): Promise<DeviceRecognition> {
    return this.registry.recognize(ref, deviceIdToken);
  }

  async issueDeviceId(ref: UserRef, deviceId: string): Promise<string> {
    return new DeviceRoute(ref, deviceId).format();
  }

  register(ref: UserRef, input: RegisterDeviceInput): Promise<DeviceSnapshot> {
    return this.registry.register(ref, input);
  }

  verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]> {
    return this.registry.verifiers(ref);
  }

  retireVerifiers(ref: UserRef): Promise<void> {
    return this.registry.retireVerifiers(ref);
  }

  forget(ref: UserRef): Promise<void> {
    return this.registry.forget(ref);
  }

  enqueueApproval(deviceId: string, approval: DeviceApproval): Promise<void> {
    return this.registry.enqueueApproval(deviceId, approval);
  }
}
