import { SystemClock } from '@platform/kernel';
import {
  ContainerRuntime,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import {
  MailpitServer,
  runEmailSenderContract,
} from '../../__tests__/utils/index.js';
import { SmtpEmailSender } from '../senders/smtp-email-sender.js';

new ContainerRuntime(process.env).describeIfAvailable(
  'SmtpEmailSender over Mailpit',
  () => {
    jest.setTimeout(120_000);
    const mailpit = new MailpitServer();
    let sender: SmtpEmailSender;

    beforeAll(async () => {
      await mailpit.start();
      const url = new URL(mailpit.smtpUrl());
      sender = new SmtpEmailSender(
        { host: url.hostname, port: Number(url.port) },
        new SequentialIdGenerator(),
        new SystemClock(),
      );
    });

    afterAll(async () => {
      await mailpit.stop();
    });

    runEmailSenderContract('SmtpEmailSender', () => ({
      sender,
      received: () => mailpit.received(),
    }));

    it('fails when nothing listens on the SMTP port', async () => {
      const closed = new SmtpEmailSender(
        { host: '127.0.0.1', port: 1 },
        new SequentialIdGenerator(),
        new SystemClock(),
      );

      await expect(
        closed.send({
          from: 'a@example.com',
          to: 'b@example.com',
          subject: 's',
          text: 't',
          html: 'h',
        }),
      ).rejects.toThrow();
    });
  },
);
