import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { MessagingErrorCode } from '@platform/messaging';
import { AwsErrorTranslator } from '../../aws-error-translator.js';
import { FakeSesClient } from '../../__tests__/utils/index.js';
import { SesEmailClient } from '../ses-email-client.js';

const email = {
  from: 'no-reply@example.com',
  to: 'ana@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
};

class ThrottlingError extends Error {
  readonly $fault = 'client';
  readonly $retryable = { throttling: true };
}

class RejectedError extends Error {
  readonly $fault = 'client';
}

describe('SesEmailClient', () => {
  it('sends one simple message with both bodies and returns the SES id', async () => {
    const ses = new FakeSesClient();

    const id = await new SesEmailClient(ses, new AwsErrorTranslator()).send(
      email,
    );

    expect(id).toBe('ses-1');
    expect(ses.sentEmails()).toEqual([
      {
        FromEmailAddress: 'no-reply@example.com',
        Destination: { ToAddresses: ['ana@example.com'] },
        Content: {
          Simple: {
            Subject: { Data: 'Welcome', Charset: 'UTF-8' },
            Body: {
              Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
              Text: { Data: 'Hello', Charset: 'UTF-8' },
            },
          },
        },
      },
    ]);
  });

  it('reports throttling as a retryable transport failure without the recipient', async () => {
    const ses = new FakeSesClient().once(SendEmailCommand, () => {
      throw new ThrottlingError('Throttling');
    });

    const sending = new SesEmailClient(ses, new AwsErrorTranslator()).send(
      email,
    );

    await expect(sending).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: true,
    });
    await expect(sending).rejects.not.toThrow(/ana@example.com/);
  });

  it('reports a rejected request as a permanent failure', async () => {
    const ses = new FakeSesClient().once(SendEmailCommand, () => {
      throw new RejectedError('MessageRejected');
    });

    await expect(
      new SesEmailClient(ses, new AwsErrorTranslator()).send(email),
    ).rejects.toMatchObject({ retryable: false });
  });

  it('closes the SDK client', () => {
    const ses = new FakeSesClient();

    new SesEmailClient(ses, new AwsErrorTranslator()).close();

    expect(ses.closes).toBe(1);
  });
});
