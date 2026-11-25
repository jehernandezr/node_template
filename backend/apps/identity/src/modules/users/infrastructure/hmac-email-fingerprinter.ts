import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';

/** HMAC-SHA256 of the normalized email with `IDENTITY_EMAIL_PEPPER`: without the key, the hash does not reveal the email. */
@Injectable()
export class HmacEmailFingerprinter extends EmailFingerprinter {
  private readonly key: string;

  constructor(settings: IdentitySettings) {
    super();
    this.key = settings.values.IDENTITY_EMAIL_PEPPER.reveal();
  }

  fingerprint(normalizedEmail: string): Buffer {
    return createHmac('sha256', this.key).update(normalizedEmail).digest();
  }
}
