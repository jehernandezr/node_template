/** Encrypts secrets the server needs to read later, such as the TOTP one. */
export abstract class SecretBox {
  abstract seal(plain: Buffer): string;
  /** @throws Error if the text was not encrypted with this key or was tampered with. */
  abstract open(sealed: string): Buffer;
}
