import type { Provider } from '@nestjs/common';
import {
  AwsClientFactory,
  AwsConfig,
  AwsErrorTranslator,
  SesEmailClient,
} from '@platform/adapters-aws';
import { AppConfig } from '@platform/config';
import { Clock, IdGenerator } from '@platform/kernel';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { EmailSenderKind } from '../../../shared/enums/email-sender-kind.enum.js';
import { EmailSender } from '../domain/email-sender.js';
import { InMemoryEmailSender } from '../infrastructure/senders/in-memory-email-sender.js';
import { SesEmailSender } from '../infrastructure/senders/ses-email-sender.js';
import { SmtpEmailSender } from '../infrastructure/senders/smtp-email-sender.js';

/** SMTP port when `SMTP_URL` does not include one. */
const SMTP_DEFAULT_PORT = 25;

/**
 * The `EmailSender` from `NOTIFICATIONS_EMAIL_SENDER`. The AWS section is only validated with SES, so a local
 * environment without AWS starts with memory or with Mailpit.
 */
export const EmailSenderProvider: Provider = {
  provide: EmailSender,
  useFactory: (
    config: AppConfig,
    ids: IdGenerator,
    clock: Clock,
  ): EmailSender => {
    const settings = config.root<NotificationsConfig>();
    switch (settings.NOTIFICATIONS_EMAIL_SENDER) {
      case EmailSenderKind.Memory:
        return new InMemoryEmailSender();
      case EmailSenderKind.Ses:
        return new SesEmailSender(
          new SesEmailClient(
            new AwsClientFactory().ses(config.get(AwsConfig)),
            new AwsErrorTranslator(),
          ),
        );
      case EmailSenderKind.Smtp: {
        const url = new URL(String(settings.SMTP_URL));
        return new SmtpEmailSender(
          {
            host: url.hostname,
            port: url.port === '' ? SMTP_DEFAULT_PORT : Number(url.port),
          },
          ids,
          clock,
        );
      }
    }
  },
  inject: [AppConfig, IdGenerator, Clock],
};
