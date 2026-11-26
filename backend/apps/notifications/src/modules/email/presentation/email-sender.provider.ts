import type { Provider } from '@nestjs/common';
import { SesEmailClient } from '@platform/adapters-aws';
import { Clock, IdGenerator } from '@platform/kernel';
import { NotificationsSettings } from '../../../config/notifications-settings.js';
import { EmailSender } from '../domain/email-sender.js';
import { EmailSenderSelector } from '../infrastructure/senders/email-sender-selector.js';
import { SmtpEmailSenderFactory } from '../infrastructure/senders/smtp-email-sender-factory.js';

/** The SMTP sender factory and the `EmailSender` that `EmailSenderSelector` picks from `NOTIFICATIONS_EMAIL_SENDER`. */
export const EmailSenderProviders: Provider[] = [
  {
    provide: SmtpEmailSenderFactory,
    useFactory: (ids: IdGenerator, clock: Clock) =>
      new SmtpEmailSenderFactory(ids, clock),
    inject: [IdGenerator, Clock],
  },
  {
    provide: EmailSender,
    useFactory: (
      settings: NotificationsSettings,
      smtp: SmtpEmailSenderFactory,
      ses: SesEmailClient | undefined,
    ): EmailSender =>
      new EmailSenderSelector(smtp, ses).select(settings.values),
    inject: [
      NotificationsSettings,
      SmtpEmailSenderFactory,
      { token: SesEmailClient, optional: true },
    ],
  },
];
