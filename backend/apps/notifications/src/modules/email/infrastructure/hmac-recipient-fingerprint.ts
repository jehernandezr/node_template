import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';

/** HMAC-SHA256 de la dirección normalizada con el pepper del servicio, en hexadecimal. */
@Injectable()
export class HmacRecipientFingerprint extends RecipientFingerprint {
  private readonly pepper: string;

  constructor(config: AppConfig) {
    super();
    this.pepper = config
      .root<NotificationsConfig>()
      .NOTIFICATIONS_EMAIL_PEPPER.reveal();
  }

  of(address: string): string {
    return createHmac('sha256', this.pepper)
      .update(address.trim().toLowerCase())
      .digest('hex');
  }
}
