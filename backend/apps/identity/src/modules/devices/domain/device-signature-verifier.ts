/** Verifica la firma ES256 de un dispositivo con su clave pública. */
export abstract class DeviceSignatureVerifier {
  /**
   * Revisa que la clave sea P-256 en SPKI DER (base64url).
   * @throws IdentityError `IDENTITY.DEVICE.KEY_INVALID` si no lo es.
   */
  abstract assertValidKey(publicKey: string): void;

  /** `false` si la firma no corresponde, incluida una clave o firma mal formada. */
  abstract verify(
    publicKey: string,
    message: string,
    signature: string,
  ): boolean;
}
