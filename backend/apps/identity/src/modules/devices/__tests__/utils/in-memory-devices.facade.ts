import type { DeviceApproval } from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { DevicesFacade } from '../../application/devices.facade.js';
import type { DeviceProof } from '../../domain/device-proof.js';
import type { DeviceRecognition } from '../../domain/device-recognition.js';
import { DeviceSignedMessage } from '../../domain/device-signed-message.js';
import type { DeviceSnapshot } from '../../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../../domain/register-device-input.js';
import { NodeDeviceSignatureVerifier } from '../../infrastructure/node-device-signature-verifier.js';

/**
 * Devices in memory. The public id is `dv1_<user>_<home tenant>_<device>`, as in the real one, and a sign-in
 * is recognized only when the stored key verifies the proof signature.
 */
export class InMemoryDevicesFacade extends DevicesFacade {
  private readonly devices = new Map<string, DeviceSnapshot>();
  private readonly approvals = new Map<string, DeviceApproval[]>();
  private readonly signatures = new NodeDeviceSignatureVerifier();

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
    proof?: DeviceProof,
  ): Promise<DeviceRecognition> {
    const device = this.userDevices(ref.userId).find(
      (candidate) =>
        proof !== undefined &&
        proof.signature.deviceId ===
          `dv1_${ref.userId}_${ref.homeTenantId}_${candidate.id}` &&
        this.signatures.verify(
          candidate.publicKey,
          DeviceSignedMessage.of(proof.action, proof.signature, proof.bound),
          proof.signature.signature,
        ),
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

  /** Approvals queued for a device, in arrival order. */
  approvalsFor(deviceId: string): readonly DeviceApproval[] {
    return this.approvals.get(deviceId) ?? [];
  }

  private userDevices(userId: string): DeviceSnapshot[] {
    return [...this.devices.values()].filter(
      (device) => device.userId === userId,
    );
  }

  async forget(ref: UserRef): Promise<void> {
    for (const [key, device] of this.devices) {
      if (device.userId === ref.userId) {
        this.devices.delete(key);
      }
    }
  }
}
