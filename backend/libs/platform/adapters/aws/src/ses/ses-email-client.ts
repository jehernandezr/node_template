import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsOperation } from '../aws-operation.enum.js';
import type { OutboundEmail } from './outbound-email.js';

/**
 * Sends emails with the SES v2 API. An SDK error comes out as `PLATFORM.MESSAGING.TRANSPORT_FAILED`,
 * retryable if it is throttling, network or a server fault; the recipient never goes in the message.
 */
export class SesEmailClient {
  constructor(
    private readonly client: SESv2Client,
    private readonly errors: AwsErrorTranslator,
  ) {}

  /**
   * Returns the id SES assigns to the message.
   * @param email Email to send.
   * @returns The message id.
   */
  async send(email: OutboundEmail): Promise<string> {
    try {
      const output = await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: email.from,
          Destination: { ToAddresses: [email.to] },
          Content: {
            Simple: {
              Subject: { Data: email.subject, Charset: 'UTF-8' },
              Body: {
                Html: { Data: email.html, Charset: 'UTF-8' },
                Text: { Data: email.text, Charset: 'UTF-8' },
              },
            },
          },
        }),
      );
      return output.MessageId ?? '';
    } catch (error) {
      throw this.errors.translate(AwsOperation.SendEmail, error);
    }
  }

  /** Destroys the SDK client. Called once, by whoever owns the client. */
  close(): void {
    this.client.destroy();
  }
}
