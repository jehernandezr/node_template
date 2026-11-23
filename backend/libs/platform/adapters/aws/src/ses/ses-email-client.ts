import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsOperation } from '../aws-operation.enum.js';
import type { OutboundEmail } from './outbound-email.js';

/**
 * Envía correos con la API v2 de SES. Un error del SDK sale como `PLATFORM.MESSAGING.TRANSPORT_FAILED`,
 * reintentable si es throttling, red o falla del servidor; el destinatario nunca va en el mensaje.
 */
export class SesEmailClient {
  constructor(
    private readonly client: SESv2Client,
    private readonly errors: AwsErrorTranslator,
  ) {}

  /** Devuelve el id que SES asigna al mensaje. */
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

  close(): void {
    this.client.destroy();
  }
}
