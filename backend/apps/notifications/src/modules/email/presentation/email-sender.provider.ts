import type { Provider } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { Clock, IdGenerator } from '@platform/kernel';
import { NotificationsSettings } from '../../../config/notifications-settings.js';
import { EmailSender } from '../domain/email-sender.js';
import { EmailSenderSelector } from '../infrastructure/senders/email-sender-selector.js';

/** The `EmailSender` that `EmailSenderSelector` picks from `NOTIFICATIONS_EMAIL_SENDER`. */
export const EmailSenderProvider: Provider = {
  provide: EmailSender,
  useFactory: (
    settings: NotificationsSettings,
    config: AppConfig,
    ids: IdGenerator,
    clock: Clock,
  ): EmailSender =>
    new EmailSenderSelector(ids, clock).select(settings.values, config),
  inject: [NotificationsSettings, AppConfig, IdGenerator, Clock],
};
