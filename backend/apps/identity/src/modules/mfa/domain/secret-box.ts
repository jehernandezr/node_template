/** Cifra secretos que el servidor necesita leer después, como el del TOTP. */
export abstract class SecretBox {
  abstract seal(plain: Buffer): string;
  /** @throws Error si el texto no lo cifró esta llave o fue alterado. */
  abstract open(sealed: string): Buffer;
}
