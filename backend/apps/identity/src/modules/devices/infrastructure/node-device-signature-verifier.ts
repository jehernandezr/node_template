import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { DeviceSignatureVerifier } from '../domain/device-signature-verifier.js';

/** ES256 with `node:crypto`. Accepts the signature in IEEE P1363 (64 bytes) or in DER, as the SDKs deliver it. */
@Injectable()
export class NodeDeviceSignatureVerifier extends DeviceSignatureVerifier {
  private static readonly P1363_BYTES = 64;

  assertValidKey(publicKey: string): void {
    if (this.keyOf(publicKey) === undefined) {
      throw new IdentityError(IdentityErrorCode.DeviceKeyInvalid);
    }
  }

  verify(publicKey: string, message: string, signature: string): boolean {
    const key = this.keyOf(publicKey);
    if (key === undefined) {
      return false;
    }
    const bytes = Buffer.from(signature, 'base64url');
    try {
      return verify(
        'sha256',
        Buffer.from(message),
        {
          key,
          dsaEncoding:
            bytes.length === NodeDeviceSignatureVerifier.P1363_BYTES
              ? 'ieee-p1363'
              : 'der',
        },
        bytes,
      );
    } catch {
      return false;
    }
  }

  private keyOf(publicKey: string): KeyObject | undefined {
    try {
      const key = createPublicKey({
        key: Buffer.from(publicKey, 'base64url'),
        format: 'der',
        type: 'spki',
      });
      return key.asymmetricKeyType === 'ec' &&
        key.asymmetricKeyDetails?.namedCurve === 'prime256v1'
        ? key
        : undefined;
    } catch {
      return undefined;
    }
  }
}
