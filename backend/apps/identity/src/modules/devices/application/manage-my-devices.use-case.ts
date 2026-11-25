import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  DeviceRemovedEvent,
  RevocationReason,
  type DevicePage,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SessionsFacade } from '../../sessions/index.js';
import { DeviceRepository } from '../domain/device.repository.js';
import type { Device } from '../domain/device.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/** The user's devices: list, remove, untrust and store the push token. */
@Injectable()
export class ManageMyDevices {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly sessions: SessionsFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  async list(ref: UserRef): Promise<DevicePage> {
    const devices = await this.scopes.inUserShard(ref, () =>
      this.devices.listActive(ref.userId),
    );
    const now = this.clock.now();
    return {
      items: devices
        .filter((device) => device.isTrusted(now))
        .map((device) => device.snapshot())
        .map((state) => ({
          id: state.id,
          name: state.name,
          platform: state.platform,
          lastSeenAt: state.lastSeenAt.toISOString(),
          ...(state.trustedUntil === undefined
            ? {}
            : { trustedUntil: state.trustedUntil.toISOString() }),
          verifier: state.verifier,
        })),
      nextCursor: null,
    };
  }

  /** Removes the device and closes its sessions. */
  async remove(ref: UserRef, deviceId: string): Promise<void> {
    const now = this.clock.now();
    await this.change(ref, deviceId, async (device) => {
      if (device.remove(now)) {
        await this.devices.update(device);
        await this.bus.publish(
          DeviceRemovedEvent,
          { userId: ref.userId, deviceId, removedAt: now.toISOString() },
          { tenantId: ref.homeTenantId },
        );
      }
    });
    await this.sessions.revokeDeviceSessions(
      ref,
      deviceId,
      RevocationReason.UserAction,
    );
  }

  async untrust(ref: UserRef, deviceId: string): Promise<void> {
    await this.change(ref, deviceId, async (device) => {
      device.untrust(this.clock.now());
      await this.devices.update(device);
    });
  }

  async setPushToken(
    ref: UserRef,
    deviceId: string,
    pushToken: string,
  ): Promise<void> {
    await this.change(ref, deviceId, async (device) => {
      device.setPushToken(pushToken);
      await this.devices.update(device);
    });
  }

  private change(
    ref: UserRef,
    deviceId: string,
    apply: (device: Device) => Promise<void>,
  ): Promise<void> {
    return this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const device = await this.devices.find(ref.userId, deviceId);
        if (device === undefined || !device.isActive()) {
          throw IdentityError.notFound();
        }
        await apply(device);
      }),
    );
  }
}
