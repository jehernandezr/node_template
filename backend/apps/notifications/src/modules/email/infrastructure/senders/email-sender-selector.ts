import type { SesEmailClient } from '@platform/adapters-aws';
import { ConfigValidationError } from '@platform/config';
import type { NotificationsConfig } from '../../../../config/notifications.config.js';
import { EmailSenderKind } from '../../../../shared/enums/email-sender-kind.enum.js';
import type { EmailSender } from '../../domain/email-sender.js';
import { InMemoryEmailSender } from './in-memory-email-sender.js';
import { SesEmailSender } from './ses-email-sender.js';
import type { SmtpEmailSenderFactory } from './smtp-email-sender-factory.js';

/**
 * Picks the `EmailSender` that `NOTIFICATIONS_EMAIL_SENDER` asks for. The SES client comes from `AwsModule`, which
 * also closes it, so a local environment without AWS starts with memory or with Mailpit.
 */
export class EmailSenderSelector {
  /** SMTP port when `SMTP_URL` does not include one. */
  static readonly SMTP_DEFAULT_PORT = 25;
  /** Variable whose presence enables `AwsModule`, and with it the SES client. */
  static readonly AWS_REGION_VARIABLE = 'AWS_REGION';

  /**
   * @param smtp Creates the SMTP sender of the configured endpoint.
   * @param ses The SES client of `AwsModule`, or `undefined` when the AWS adapter is not enabled.
   */
  constructor(
    private readonly smtp: SmtpEmailSenderFactory,
    private readonly ses: SesEmailClient | undefined,
  ) {}

  /**
   * The sender of the configured kind.
   * @param settings Sender kind and SMTP URL from the configuration.
   * @returns The sender to inject.
   * @throws ConfigValidationError with SES when the AWS adapter is not enabled.
   */
  select(
    settings: Pick<
      NotificationsConfig,
      'NOTIFICATIONS_EMAIL_SENDER' | 'SMTP_URL'
    >,
  ): EmailSender {
    switch (settings.NOTIFICATIONS_EMAIL_SENDER) {
      case EmailSenderKind.Memory:
        return new InMemoryEmailSender();
      case EmailSenderKind.Ses:
        return new SesEmailSender(this.sesClient());
      case EmailSenderKind.Smtp: {
        const url = new URL(String(settings.SMTP_URL));
        return this.smtp.create({
          host: url.hostname,
          port:
            url.port === ''
              ? EmailSenderSelector.SMTP_DEFAULT_PORT
              : Number(url.port),
        });
      }
    }
  }

  private sesClient(): SesEmailClient {
    if (this.ses === undefined) {
      throw new ConfigValidationError([
        {
          path: EmailSenderSelector.AWS_REGION_VARIABLE,
          code: 'required',
          message: 'NOTIFICATIONS_EMAIL_SENDER=ses needs the AWS adapter',
        },
      ]);
    }
    return this.ses;
  }
}
