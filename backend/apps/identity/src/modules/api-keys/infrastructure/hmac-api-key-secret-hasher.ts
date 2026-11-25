import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { constantTimeEquals } from '../../../shared/utils/constant-time.js';
import { ApiKeySecretHasher } from '../domain/api-key-store.js';

/** HMAC-SHA256 with `IDENTITY_API_KEY_PEPPER`: a copy of the database does not allow testing secrets without the key. */
@Injectable()
export class HmacApiKeySecretHasher extends ApiKeySecretHasher {
  private readonly key: string;

  constructor(settings: IdentitySettings) {
    super();
    this.key = settings.values.IDENTITY_API_KEY_PEPPER.reveal();
  }

  hmac(secretSha256: string): string {
    return createHmac('sha256', this.key)
      .update(secretSha256)
      .digest('base64url');
  }

  matches(secretSha256: string, hmac: string): boolean {
    return constantTimeEquals(this.hmac(secretSha256), hmac);
  }
}
