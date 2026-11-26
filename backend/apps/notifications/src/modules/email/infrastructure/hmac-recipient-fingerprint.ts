import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { NotificationsSettings } from '../../../config/notifications-settings.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';

/** HMAC-SHA256 of the normalized address with the service's pepper, in hexadecimal. */
@Injectable()
export class HmacRecipientFingerprint extends RecipientFingerprint {
  private readonly pepper: string;

  constructor(settings: NotificationsSettings) {
    super();
    this.pepper = settings.values.NOTIFICATIONS_EMAIL_PEPPER.reveal();
  }

  override of(address: string): string {
    return createHmac('sha256', this.pepper)
      .update(address.trim().toLowerCase())
      .digest('hex');
  }
}
