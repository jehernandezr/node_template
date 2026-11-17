import type { DeviceApproval } from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { DevicesFacade } from '../../application/devices.facade.js';
import type { DeviceRecognition } from '../../domain/device-recognition.js';
import type { DeviceSnapshot } from '../../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../../domain/register-device-input.js';

/** Dispositivos en memoria. El id público es `dv1_<usuario>_<tenant de origen>_<dispositivo>`, como el real. */
export class InMemoryDevicesFacade extends DevicesFacade {
  private readonly devices = new Map<string, DeviceSnapshot>();
  private readonly approvals = new Map<string, DeviceApproval[]>();

  constructor(private readonly ids: IdGenerator = new SequentialIdGenerator()) {
    super();
  }

  add(device: DeviceSnapshot): this {
    this.devices.set(device.id, device);
    return this;
  }

  async issueDeviceId(ref: UserRef, deviceId: string): Promise<string> {
    return `dv1_${ref.userId}_${ref.homeTenantId}_${deviceId}`;
  }

  async recognize(
    ref: UserRef,
    deviceIdToken?: string,
  ): Promise<DeviceRecognition> {
    const device = this.userDevices(ref.userId).find(
      (candidate) =>
        deviceIdToken ===
        `dv1_${ref.userId}_${ref.homeTenantId}_${candidate.id}`,
    );
    return device === undefined
      ? { recognized: false }
      : { recognized: true, device };
  }

  async register(
    ref: UserRef,
    input: RegisterDeviceInput,
  ): Promise<DeviceSnapshot> {
    const device: DeviceSnapshot = {
      id: this.ids.next().toString(),
      userId: ref.userId,
      name: input.name ?? input.platform,
      platform: input.platform,
      publicKey: input.publicKey,
      verifier: this.userDevices(ref.userId).every(
        (existing) => !existing.verifier,
      ),
    };
    this.devices.set(device.id, device);
    return device;
  }

  async verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]> {
    return this.userDevices(ref.userId).filter((device) => device.verifier);
  }

  async retireVerifiers(ref: UserRef): Promise<void> {
    for (const device of this.userDevices(ref.userId)) {
      this.devices.set(device.id, { ...device, verifier: false });
    }
  }

  async enqueueApproval(
    deviceId: string,
    approval: DeviceApproval,
  ): Promise<void> {
    this.approvals.set(deviceId, [
      ...(this.approvals.get(deviceId) ?? []),
      approval,
    ]);
  }

  /** Aprobaciones encoladas para un dispositivo, en el orden en que llegaron. */
  approvalsFor(deviceId: string): readonly DeviceApproval[] {
    return this.approvals.get(deviceId) ?? [];
  }

  private userDevices(userId: string): DeviceSnapshot[] {
    return [...this.devices.values()].filter(
      (device) => device.userId === userId,
    );
  }
}
