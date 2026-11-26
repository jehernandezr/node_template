import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { IdentityLimits, type PushTargets } from '@contracts/identity';
import { Clock } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DeviceRepository } from '../domain/device.repository.js';

/**
 * Devices a push can be sent to: current, trusted and with a token. An untrusted device
 * no longer approves sign-ins, so it does not receive account alerts either.
 */
@Injectable()
export class ListPushTargets {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly scopes: ShardScopes,
    private readonly clock: Clock,
  ) {}

  /**
   * Lists the active devices of a user that registered a push token.
   * @param ref User to read.
   * @returns Its push targets.
   */
  async execute(ref: UserRef): Promise<PushTargets> {
    const devices = await this.scopes.inUserShard(ref, () =>
      this.devices.listActive(ref.userId),
    );
    const now = this.clock.now();
    const targets = devices
      .filter((device) => device.isTrusted(now))
      .map((device) => device.snapshot())
      .flatMap((state) =>
        state.pushToken === undefined
          ? []
          : [
              {
                deviceId: state.id,
                platform: state.platform,
                pushToken: state.pushToken,
              },
            ],
      )
      .slice(0, IdentityLimits.maxPushTargets);
    return { targets };
  }
}
