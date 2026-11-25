import {
  AwsClientFactory,
  AwsConfig,
  AwsErrorTranslator,
  SesEmailClient,
} from '@platform/adapters-aws';
import type { AppConfig } from '@platform/config';
import type { Clock, IdGenerator } from '@platform/kernel';
import type { NotificationsConfig } from '../../../../config/notifications.config.js';
import { EmailSenderKind } from '../../../../shared/enums/email-sender-kind.enum.js';
import type { EmailSender } from '../../domain/email-sender.js';
import { InMemoryEmailSender } from './in-memory-email-sender.js';
import { SesEmailSender } from './ses-email-sender.js';
import { SmtpEmailSender } from './smtp-email-sender.js';

/**
 * Builds the `EmailSender` that `NOTIFICATIONS_EMAIL_SENDER` asks for. The AWS section is only read with SES, so a
 * local environment without AWS starts with memory or with Mailpit.
 */
export class EmailSenderSelector {
  /** SMTP port when `SMTP_URL` does not include one. */
  static readonly SMTP_DEFAULT_PORT = 25;

  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * The sender of the configured kind.
   * @throws ConfigValidationError with SES if the AWS section of the environment is invalid.
   */
  select(
    settings: Pick<
      NotificationsConfig,
      'NOTIFICATIONS_EMAIL_SENDER' | 'SMTP_URL'
    >,
    config: AppConfig,
  ): EmailSender {
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
            port:
              url.port === ''
                ? EmailSenderSelector.SMTP_DEFAULT_PORT
                : Number(url.port),
          },
          this.ids,
          this.clock,
        );
      }
    }
  }
}
