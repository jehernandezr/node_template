import { AwsErrorTranslator, SesEmailClient } from '@platform/adapters-aws';
import { FakeSesClient } from '@platform/adapters-aws/test-utils';
import { runEmailSenderContract } from '../../__tests__/utils/index.js';
import { InMemoryEmailSender } from '../senders/in-memory-email-sender.js';
import { SesEmailSender } from '../senders/ses-email-sender.js';

runEmailSenderContract('InMemoryEmailSender', () => {
  const sender = new InMemoryEmailSender();
  return { sender, received: async () => sender.sent };
});

runEmailSenderContract('SesEmailSender', () => {
  const ses = new FakeSesClient();
  return {
    sender: new SesEmailSender(
      new SesEmailClient(ses, new AwsErrorTranslator()),
    ),
    received: async () =>
      ses.sentEmails().map((input) => ({
        from: String(input.FromEmailAddress),
        to: String(input.Destination?.ToAddresses?.[0]),
        subject: String(input.Content?.Simple?.Subject?.Data),
        text: String(input.Content?.Simple?.Body?.Text?.Data),
        html: String(input.Content?.Simple?.Body?.Html?.Data),
      })),
  };
});

describe('SesEmailSender', () => {
  it('leaves the SES client open on close, for AwsModule to destroy it', () => {
    const ses = new FakeSesClient();

    new SesEmailSender(
      new SesEmailClient(ses, new AwsErrorTranslator()),
    ).close();

    expect(ses.closes).toBe(0);
  });
});
