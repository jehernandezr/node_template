import { Injectable } from '@nestjs/common';
import {
  DeviceRegisteredEvent,
  SecurityAlertType,
  type DeviceApproval,
} from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import { DeviceRepository } from '../domain/device.repository.js';
import { DeviceRoute } from '../domain/device-route.js';
import { DeviceSignatureVerifier } from '../domain/device-signature-verifier.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import { Device, type DeviceState } from '../domain/device.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';
import { PushNotifier } from '../domain/push-notifier.js';

/** Reconoce, registra y consulta los dispositivos de un usuario, y les encola aprobaciones. */
@Injectable()
export class DeviceRegistry {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly approvals: DeviceApprovalStore,
    private readonly signatures: DeviceSignatureVerifier,
    private readonly push: PushNotifier,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async recognize(
    ref: UserRef,
    deviceIdToken?: string,
  ): Promise<DeviceRecognition> {
    const route =
      deviceIdToken === undefined
        ? undefined
        : DeviceRoute.parse(deviceIdToken);
    if (route === undefined || route.user.userId !== ref.userId) {
      return { recognized: false };
    }
    const device = await this.scopes.inUserShard(ref, () =>
      this.devices.find(ref.userId, route.deviceId),
    );
    return device === undefined || !device.isTrusted(this.clock.now())
      ? { recognized: false }
      : {
          recognized: true,
          device: DeviceRegistry.snapshotOf(device.snapshot()),
        };
  }

  /**
   * Guarda un dispositivo nuevo. El primero de la cuenta queda como verificador: desde ahí aprueba los
   * inicios de sesión de los demás.
   * @throws IdentityError `IDENTITY.DEVICE.KEY_INVALID` si la clave no es P-256.
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

  async verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]> {
    const devices = await this.scopes.inUserShard(ref, () =>
      this.devices.listActive(ref.userId),
    );
    const now = this.clock.now();
    return devices
      .filter((device) => device.snapshot().verifier && device.isTrusted(now))
      .map((device) => DeviceRegistry.snapshotOf(device.snapshot()));
  }

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

  /** Avisa por push a cada verificador que tiene una aprobación pendiente. */
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
