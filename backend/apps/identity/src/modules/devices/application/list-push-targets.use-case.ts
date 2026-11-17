import { Injectable } from '@nestjs/common';
import { IdentityLimits, type PushTargets } from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DeviceRepository } from '../domain/device.repository.js';

/**
 * Dispositivos a los que se puede enviar un push: vigentes, con confianza y con token. Un dispositivo sin
 * confianza ya no aprueba inicios de sesión, así que tampoco recibe avisos de la cuenta.
 */
@Injectable()
export class ListPushTargets {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly clock: Clock,
  ) {}

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
