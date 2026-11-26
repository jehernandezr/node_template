import { SecretBox } from '../../domain/secret-box.js';

/** `SecretBox` that keeps the secret as base64: the tests only need to read back what they stored. */
export class PlainSecretBox extends SecretBox {
  override seal(plain: Buffer): string {
    return plain.toString('base64');
  }

  override open(sealed: string): Buffer {
    return Buffer.from(sealed, 'base64');
  }
}
