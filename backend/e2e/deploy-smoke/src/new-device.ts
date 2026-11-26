import { generateKeyPairSync } from 'node:crypto';

/** A device key the suite has never registered, so every sign-in is from a new device and asks for MFA. */
export class NewDevice {
  /** SPKI DER of a fresh P-256 public key in base64url: the `devicePublicKey` of the contract. */
  readonly publicKey = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    .publicKey.export({ format: 'der', type: 'spki' })
    .toString('base64url');
}
