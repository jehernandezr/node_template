import type { SesEmailClient } from '@platform/adapters-aws';
import { EmailSender } from '../../domain/email-sender.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';

/** Email through SES on AWS. The client belongs to `AwsModule`, which closes it on shutdown. */
export class SesEmailSender extends EmailSender {
  constructor(private readonly ses: SesEmailClient) {
    super();
  }

  /** Sends the email through SES and returns the id SES assigns to it. */
  override send(email: OutgoingEmail): Promise<string> {
    return this.ses.send(email);
  }
}
