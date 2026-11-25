import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  DeviceRegisteredEvent,
  SecurityAlertType,
  type DeviceApproval,
} from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';
import type { DeviceProof } from '../domain/device-proof.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import { DeviceRepository } from '../domain/device.repository.js';
import { DeviceSignatureVerifier } from '../domain/device-signature-verifier.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import { Device, type DeviceState } from '../domain/device.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';
import { PushNotifier } from '../domain/push-notifier.js';
import { SignedDeviceRequest } from './signed-device-request.js';

/** Recognizes, registers and reads the devices of a user, and queues approvals for them. */
@Injectable()
export class DeviceRegistry {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly approvals: DeviceApprovalStore,
    private readonly signatures: DeviceSignatureVerifier,
    private readonly signedRequests: SignedDeviceRequest,
    private readonly push: PushNotifier,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Recognizes the device of a sign-in only from a valid signature of one of the user's trusted devices:
   * the public device id alone proves nothing.
   * @param ref User who is signing in.
   * @param proof Device signature that the request carries, if any.
   * @returns Whether the device is recognized and, if so, its snapshot.
   */
  async recognize(
    ref: UserRef,
    proof?: DeviceProof,
  ): Promise<DeviceRecognition> {
    if (proof === undefined) {
      return { recognized: false };
    }
    const signed = await this.signedRequests.check(
      proof.action,
      proof.signature,
      proof.bound,
    );
    if (
      signed === undefined ||
      signed.route.user.userId !== ref.userId ||
      signed.route.user.homeTenantId !== ref.homeTenantId
    ) {
      return { recognized: false };
    }
    return {
      recognized: true,
      device: DeviceRegistry.snapshotOf(signed.device.snapshot()),
    };
  }

  /**
   * Stores a new device. The first one of the account becomes the verifier: from it the user approves the
   * sign-ins of the others.
   * @param ref Owner of the device.
   * @param input Public key, platform, name and IP of the device.
   * @returns The stored device.
   * @throws IdentityError `IDENTITY.DEVICE.KEY_INVALID` if the key is not P-256.
   */
  async register(
    ref: UserRef,
    input: RegisterDeviceInput,
  ): Promise<DeviceSnapshot> {
    this.signatures.assertValidKey(input.publicKey);
    const now = this.clock.now();
    const device = await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const existing = await this.devices.listActive(ref.userId);
        const created = Device.register({
          id: this.ids.next().toString(),
          userId: ref.userId,
          name: input.name ?? input.platform,
          platform: input.platform,
          publicKey: input.publicKey,
          firstSeenAt: now,
          lastSeenAt: now,
          lastIp: input.ip,
          verifier: existing.every(
            (candidate) => !candidate.snapshot().verifier,
          ),
        });
        await this.devices.insert(created);
        await this.bus.publish(
          DeviceRegisteredEvent,
          {
            userId: ref.userId,
            deviceId: created.id,
            platform: input.platform,
            verifier: created.snapshot().verifier,
            registeredAt: now.toISOString(),
          },
          { tenantId: ref.homeTenantId },
        );
        return created;
      }),
    );
    await this.alerts.raise({
      type: device.snapshot().verifier
        ? SecurityAlertType.VerifierRegistered
        : SecurityAlertType.NewDeviceSignIn,
      user: ref,
      context: { platform: input.platform },
    });
    return DeviceRegistry.snapshotOf(device.snapshot());
  }

  /**
   * Lists the trusted verifier devices of a user.
   * @param ref User whose verifiers are listed.
   * @returns The verifiers that are still trusted.
   */
  async verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]> {
    const devices = await this.scopes.inUserShard(ref, () =>
      this.devices.listActive(ref.userId),
    );
    const now = this.clock.now();
    return devices
      .filter((device) => device.snapshot().verifier && device.isTrusted(now))
      .map((device) => DeviceRegistry.snapshotOf(device.snapshot()));
  }

  /**
   * Removes the verifier role from every device of the user.
   * @param ref User whose verifiers are retired.
   */
  async retireVerifiers(ref: UserRef): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        for (const device of await this.devices.listActive(ref.userId)) {
          if (device.snapshot().verifier) {
            device.retireVerifier();
            await this.devices.update(device);
          }
        }
      }),
    );
  }

  /**
   * Removes every active device of the user.
   * @param ref User whose devices are removed.
   */
  async forget(ref: UserRef): Promise<void> {
    const now = this.clock.now();
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        for (const device of await this.devices.listActive(ref.userId)) {
          device.remove(now);
          await this.devices.update(device);
        }
      }),
    );
  }

  /**
   * Queues an approval for a device until the approval expires.
   * @param deviceId Device that must approve.
   * @param approval Approval to show on the device.
   */
  async enqueueApproval(
    deviceId: string,
    approval: DeviceApproval,
  ): Promise<void> {
    await this.approvals.enqueue(
      deviceId,
      approval,
      Math.max(1, Date.parse(approval.expiresAt) - this.clock.now().getTime()),
    );
  }

  /**
   * Wakes every verifier of the user by push so it pulls its pending approval.
   * @param ref User whose verifiers are woken.
   */
  async wakeVerifiers(ref: UserRef): Promise<void> {
    const devices = await this.scopes.inUserShard(ref, () =>
      this.devices.listActive(ref.userId),
    );
    for (const device of devices) {
      const state = device.snapshot();
      if (state.verifier && state.pushToken !== undefined) {
        await this.push.wake(state.id, state.pushToken);
      }
    }
  }

  /**
   * Maps the state of a device to the snapshot other modules read.
   * @param state Device state.
   * @returns The device snapshot.
   */
  static snapshotOf(state: DeviceState): DeviceSnapshot {
    return {
      id: state.id,
      userId: state.userId,
      name: state.name,
      platform: state.platform,
      publicKey: state.publicKey,
      verifier: state.verifier,
      ...(state.trustedUntil === undefined
        ? {}
        : { trustedUntil: state.trustedUntil }),
    };
  }
}
