import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SecretBox } from '../domain/secret-box.js';

/** AES-256-GCM con `IDENTITY_DATA_KEY`: `<iv>.<etiqueta>.<cifrado>` en base64url. */
@Injectable()
export class AesGcmSecretBox extends SecretBox {
  private static readonly IV_BYTES = 12;
  private readonly key: Buffer;

  constructor(settings: IdentitySettings) {
    super();
    // La llave de la configuración es texto; su SHA-256 da los 32 bytes que pide AES-256.
    this.key = createHash('sha256')
      .update(settings.values.IDENTITY_DATA_KEY.reveal())
      .digest();
  }

  seal(plain: Buffer): string {
    const iv = randomBytes(AesGcmSecretBox.IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  open(sealed: string): Buffer {
    const [iv, tag, encrypted] = sealed
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    if (iv === undefined || tag === undefined || encrypted === undefined) {
      throw new Error('Malformed sealed secret');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
