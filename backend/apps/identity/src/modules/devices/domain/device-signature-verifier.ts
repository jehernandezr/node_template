/** Verifies a device's ES256 signature with its public key. */
export abstract class DeviceSignatureVerifier {
  /**
   * Checks that the key is P-256 in SPKI DER (base64url).
   * @throws IdentityError `IDENTITY.DEVICE.KEY_INVALID` if it is not.
   */
  abstract assertValidKey(publicKey: string): void;

  /** `false` if the signature does not match, including a malformed key or signature. */
  abstract verify(
    publicKey: string,
    message: string,
    signature: string,
  ): boolean;
}
