import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type DeviceSignatureFields,
} from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';
import { DeviceRepository } from '../domain/device.repository.js';
import { DeviceRoute } from '../domain/device-route.js';
import { DeviceSignatureVerifier } from '../domain/device-signature-verifier.js';
import type { Device } from '../domain/device.js';

/** El dispositivo que firmó una petición sin sesión, ya verificado. */
export interface SignedDevice {
  readonly route: DeviceRoute;
  readonly device: Device;
}

/**
 * Verifica una petición firmada por un dispositivo: la firma ES256 de
 * `<acción>\n<deviceId>\n<timestamp>\n<nonce>[\n<extra>]`, la hora dentro de un minuto y un nonce sin usar.
 */
@Injectable()
export class SignedDeviceRequest {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly approvals: DeviceApprovalStore,
    private readonly signatures: DeviceSignatureVerifier,
    private readonly scopes: IdentityShardScopes,
    private readonly clock: Clock,
  ) {}

  /** @throws IdentityError `IDENTITY.DEVICE.SIGNATURE_INVALID` si algo no cuadra; nunca dice qué. */
  async verify(
    action: string,
    fields: DeviceSignatureFields,
    extra: readonly string[] = [],
  ): Promise<SignedDevice> {
    const route = DeviceRoute.parse(fields.deviceId);
    const skew = Math.abs(
      this.clock.now().getTime() - Date.parse(fields.timestamp),
    );
    if (
      route === undefined ||
      !(skew <= IdentityDefaults.deviceSignatureSkewMs)
    ) {
      throw SignedDeviceRequest.invalid();
    }
    const device = await this.scopes.inUserShard(route.user, () =>
      this.devices.find(route.user.userId, route.deviceId),
    );
    const message = [
      action,
      fields.deviceId,
      fields.timestamp,
      fields.nonce,
      ...extra,
    ].join('\n');
    if (
      device === undefined ||
      !device.isTrusted(this.clock.now()) ||
      !this.signatures.verify(
        device.snapshot().publicKey,
        message,
        fields.signature,
      )
    ) {
      throw SignedDeviceRequest.invalid();
    }
    if (!(await this.approvals.useNonce(route.deviceId, fields.nonce))) {
      throw SignedDeviceRequest.invalid();
    }
    return { route, device };
  }

  private static invalid(): IdentityError {
    return new IdentityError(IdentityErrorCode.DeviceSignatureInvalid);
  }
}
