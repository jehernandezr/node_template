/** Verifies a device's ES256 signature with its public key. */
export abstract class DeviceSignatureVerifier {
  /**
   * Checks that the key is P-256 in SPKI DER (base64url).
   * @param publicKey Public key to check.
   * @throws IdentityError `IDENTITY.DEVICE.KEY_INVALID` if it is not.
   */
  abstract assertValidKey(publicKey: string): void;

  /**
   * `false` if the signature does not match, including a malformed key or signature.
   * @param publicKey SPKI key of the device.
   * @param message Signed message.
   * @param signature ES256 signature.
   * @returns Whether it matches.
   */
  abstract verify(
    publicKey: string,
    message: string,
    signature: string,
  ): boolean;
}
