import type { SesEmailClient } from '@platform/adapters-aws';
import { EmailSender } from '../../domain/email-sender.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';

/** Correo por SES en AWS. */
export class SesEmailSender extends EmailSender {
  constructor(private readonly ses: SesEmailClient) {
    super();
  }

  send(email: OutgoingEmail): Promise<string> {
    return this.ses.send(email);
  }

  override close(): void {
    this.ses.close();
  }
}
