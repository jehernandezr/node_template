import { createHmac } from 'node:crypto';
import { constantTimeEquals } from '../shared/utils/constant-time.js';
import { SecretHasher } from './secret-hasher.js';

/** `SecretHasher` con HMAC-SHA256 y una llave del servicio (`IDENTITY_TOKEN_PEPPER`). */
export class HmacSecretHasher extends SecretHasher {
  constructor(private readonly key: string) {
    super();
  }

  digest(value: string | Uint8Array): string {
    return createHmac('sha256', this.key).update(value).digest('base64url');
  }

  matches(value: string | Uint8Array, digest: string): boolean {
    return constantTimeEquals(this.digest(value), digest);
  }
}
