import {
  ConfigLoader,
  ConfigRegistry,
  RegistryAppConfig,
  type ConfigEnv,
} from '@platform/config';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { EmailSenderKind } from '../../../../shared/enums/email-sender-kind.enum.js';
import { EmailSenderSelector } from '../senders/email-sender-selector.js';
import { InMemoryEmailSender } from '../senders/in-memory-email-sender.js';
import { SesEmailSender } from '../senders/ses-email-sender.js';
import { SmtpEmailSender } from '../senders/smtp-email-sender.js';

class SelectionFixture {
  readonly selector = new EmailSenderSelector(
    new SequentialIdGenerator(),
    new FixedClock(),
  );

  select(kind: EmailSenderKind, env: ConfigEnv = {}) {
    return this.selector.select(
      { NOTIFICATIONS_EMAIL_SENDER: kind, SMTP_URL: env['SMTP_URL'] },
      new RegistryAppConfig(new ConfigLoader(env), new ConfigRegistry()),
    );
  }
}

describe('EmailSenderSelector', () => {
  it('keeps the email in memory when the kind is memory', () => {
    expect(
      new SelectionFixture().select(EmailSenderKind.Memory),
    ).toBeInstanceOf(InMemoryEmailSender);
  });

  it('sends through SMTP when the kind is smtp', () => {
    const sender = new SelectionFixture().select(EmailSenderKind.Smtp, {
      SMTP_URL: 'smtp://localhost',
    });

    expect(sender).toBeInstanceOf(SmtpEmailSender);
  });

  it('sends through SES with the AWS section of the environment', () => {
    const sender = new SelectionFixture().select(EmailSenderKind.Ses, {
      AWS_REGION: 'us-east-1',
      AWS_ACCOUNT_ID: '000000000000',
      MESSAGING_NAME_PREFIX: 'notifications-test',
    });

    expect(sender).toBeInstanceOf(SesEmailSender);
  });

  it('fails with SES when the AWS section is missing', () => {
    expect(() => new SelectionFixture().select(EmailSenderKind.Ses)).toThrow();
  });
});
