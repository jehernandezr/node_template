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
import { DeviceSignedMessage } from '../domain/device-signed-message.js';
import type { Device } from '../domain/device.js';

/** The device that signed a request without a session, already verified. */
export interface SignedDevice {
  readonly route: DeviceRoute;
  readonly device: Device;
}

/**
 * Verifies a request signed by a device: the ES256 signature of `DeviceSignedMessage`, a timestamp within
 * the allowed skew and a nonce that was never used.
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

  /**
   * Verifies the signed request and spends its nonce.
   * @param action Route the device calls.
   * @param fields Signature fields of the request.
   * @param bound Request values the signature covers after the nonce.
   * @returns The trusted device that signed it.
   * @throws IdentityError `IDENTITY.DEVICE.SIGNATURE_INVALID` if anything does not match; it never says what.
   */
  async verify(
    action: string,
    fields: DeviceSignatureFields,
    bound: readonly string[] = [],
  ): Promise<SignedDevice> {
    const signed = await this.check(action, fields, bound);
    if (signed === undefined) {
      throw new IdentityError(IdentityErrorCode.DeviceSignatureInvalid);
    }
    return signed;
  }

  /**
   * Same checks as `verify`, without throwing.
   * @param action Route the device calls.
   * @param fields Signature fields of the request.
   * @param bound Request values the signature covers after the nonce.
   * @returns The trusted device that signed it, or `undefined` if the proof does not hold.
   */
  async check(
    action: string,
    fields: DeviceSignatureFields,
    bound: readonly string[] = [],
  ): Promise<SignedDevice | undefined> {
    const route = DeviceRoute.parse(fields.deviceId);
    const skew = Math.abs(
      this.clock.now().getTime() - Date.parse(fields.timestamp),
    );
    if (
      route === undefined ||
      !(skew <= IdentityDefaults.deviceSignatureSkewMs)
    ) {
      return undefined;
    }
    const device = await this.scopes.inUserShard(route.user, () =>
      this.devices.find(route.user.userId, route.deviceId),
    );
    if (
      device === undefined ||
      !device.isTrusted(this.clock.now()) ||
      !this.signatures.verify(
        device.snapshot().publicKey,
        DeviceSignedMessage.of(action, fields, bound),
        fields.signature,
      )
    ) {
      return undefined;
    }
    if (!(await this.approvals.useNonce(route.deviceId, fields.nonce))) {
      return undefined;
    }
    return { route, device };
  }
}
