import { AwsErrorTranslator, SesEmailClient } from '@platform/adapters-aws';
import { FakeSesClient } from '@platform/adapters-aws/test-utils';
import { ConfigValidationError } from '@platform/config';
import { EmailSenderKind } from '../../../../shared/enums/email-sender-kind.enum.js';
import { RecordingSmtpEmailSenderFactory } from '../../__tests__/utils/index.js';
import { EmailSenderSelector } from '../senders/email-sender-selector.js';
import { InMemoryEmailSender } from '../senders/in-memory-email-sender.js';
import { SesEmailSender } from '../senders/ses-email-sender.js';
import { SmtpEmailSender } from '../senders/smtp-email-sender.js';

class SelectionFixture {
  readonly smtp = new RecordingSmtpEmailSenderFactory();
  readonly ses = new FakeSesClient();

  select(kind: EmailSenderKind, smtpUrl?: string) {
    return new EmailSenderSelector(
      this.smtp,
      new SesEmailClient(this.ses, new AwsErrorTranslator()),
    ).select({ NOTIFICATIONS_EMAIL_SENDER: kind, SMTP_URL: smtpUrl });
  }

  selectWithoutAws(kind: EmailSenderKind) {
    return new EmailSenderSelector(this.smtp, undefined).select({
      NOTIFICATIONS_EMAIL_SENDER: kind,
      SMTP_URL: undefined,
    });
  }
}

describe('EmailSenderSelector', () => {
  it('keeps the email in memory when the kind is memory', () => {
    expect(
      new SelectionFixture().select(EmailSenderKind.Memory),
    ).toBeInstanceOf(InMemoryEmailSender);
  });

  it('sends through SMTP to the URL host on port 25 when the URL has no port', () => {
    const fixture = new SelectionFixture();

    const sender = fixture.select(EmailSenderKind.Smtp, 'smtp://mail.local');

    expect(sender).toBeInstanceOf(SmtpEmailSender);
    expect(fixture.smtp.endpoints).toEqual([
      { host: 'mail.local', port: EmailSenderSelector.SMTP_DEFAULT_PORT },
    ]);
    expect(EmailSenderSelector.SMTP_DEFAULT_PORT).toBe(25);
  });

  it('sends through SMTP to the port of the URL when it has one', () => {
    const fixture = new SelectionFixture();

    fixture.select(EmailSenderKind.Smtp, 'smtp://localhost:1025');

    expect(fixture.smtp.endpoints).toEqual([{ host: 'localhost', port: 1025 }]);
  });

  it('sends through SES with the client of the AWS adapter', async () => {
    const fixture = new SelectionFixture();

    const sender = fixture.select(EmailSenderKind.Ses);
    await sender.send({
      from: 'noreply@example.test',
      to: 'user@example.test',
      subject: 'Subject',
      text: 'Text',
      html: '<p>Html</p>',
    });

    expect(sender).toBeInstanceOf(SesEmailSender);
    expect(fixture.ses.sentEmails()).toHaveLength(1);
  });

  it('fails with ConfigValidationError when SES is asked for without the AWS adapter', () => {
    expect(() =>
      new SelectionFixture().selectWithoutAws(EmailSenderKind.Ses),
    ).toThrow(ConfigValidationError);
  });
});
