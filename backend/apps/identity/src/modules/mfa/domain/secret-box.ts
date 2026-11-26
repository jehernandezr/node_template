/** Encrypts secrets the server needs to read later, such as the TOTP one. */
export abstract class SecretBox {
  /**
   * Encrypts a secret to store it.
   * @param plain Secret bytes.
   * @returns The sealed text.
   */
  abstract seal(plain: Buffer): string;
  /**
   * Decrypts a stored secret.
   * @param sealed Sealed text.
   * @returns The secret bytes.
   * @throws Error if the text was not encrypted with this key or was tampered with.
   */
  abstract open(sealed: string): Buffer;
}
