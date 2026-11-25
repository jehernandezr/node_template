import { Injectable } from '@nestjs/common';
import type { DeviceApproval } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { DeviceProof } from '../domain/device-proof.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import { DeviceRoute } from '../domain/device-route.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';
import { DeviceRegistry } from './device-registry.js';
import { DevicesFacade } from './devices.facade.js';

/** `DevicesFacade` inside the process. */
@Injectable()
export class LocalDevicesFacade extends DevicesFacade {
  constructor(private readonly registry: DeviceRegistry) {
    super();
  }

  /** {@inheritDoc DevicesFacade.recognize} */
  recognize(ref: UserRef, proof?: DeviceProof): Promise<DeviceRecognition> {
    return this.registry.recognize(ref, proof);
  }

  /** {@inheritDoc DevicesFacade.issueDeviceId} */
  async issueDeviceId(ref: UserRef, deviceId: string): Promise<string> {
    return new DeviceRoute(ref, deviceId).format();
  }

  /** {@inheritDoc DevicesFacade.register} */
  register(ref: UserRef, input: RegisterDeviceInput): Promise<DeviceSnapshot> {
    return this.registry.register(ref, input);
  }

  /** {@inheritDoc DevicesFacade.verifiers} */
  verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]> {
    return this.registry.verifiers(ref);
  }

  /** {@inheritDoc DevicesFacade.retireVerifiers} */
  retireVerifiers(ref: UserRef): Promise<void> {
    return this.registry.retireVerifiers(ref);
  }

  /** {@inheritDoc DevicesFacade.forget} */
  forget(ref: UserRef): Promise<void> {
    return this.registry.forget(ref);
  }

  /** {@inheritDoc DevicesFacade.enqueueApproval} */
  enqueueApproval(deviceId: string, approval: DeviceApproval): Promise<void> {
    return this.registry.enqueueApproval(deviceId, approval);
  }
}
