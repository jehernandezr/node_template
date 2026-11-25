import {
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from 'node:crypto';
import type { DeviceSignatureFields } from '@contracts/identity';
import { DeviceSignedMessage } from '../../modules/devices/domain/device-signed-message.js';

/** P-256 key of a test device, like the one the app keeps in its secure enclave. */
export class DeviceKey {
  private readonly privateKey: KeyObject;
  /** SPKI DER in base64url: the `devicePublicKey` of the contract. */
  readonly publicKey: string;

  constructor() {
    const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64url');
  }

  /**
   * Signs a request without a session as the app does.
   * @param action Route the device calls.
   * @param deviceId Public device id.
   * @param bound Request values the signature covers after the nonce.
   * @returns The signature fields to copy into the request body.
   */
  signed(
    action: string,
    deviceId: string,
    bound: readonly string[] = [],
  ): DeviceSignatureFields {
    const fields = {
      deviceId,
      timestamp: new Date().toISOString(),
      nonce: randomBytes(16).toString('base64url'),
    };
    const signature = sign(
      'sha256',
      Buffer.from(DeviceSignedMessage.of(action, fields, bound)),
      { key: this.privateKey, dsaEncoding: 'ieee-p1363' },
    ).toString('base64url');
    return { ...fields, signature };
  }
}
