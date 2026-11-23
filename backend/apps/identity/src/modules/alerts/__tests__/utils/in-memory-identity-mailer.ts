import { IdentityMailer } from '../../domain/identity-mailer.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';

/** Correo de identity en memoria: guarda cada envío y expone el último. */
export class InMemoryIdentityMailer extends IdentityMailer {
  readonly sent: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<void> {
    this.sent.push(email);
  }

  last(): OutgoingEmail | undefined {
    return this.sent[this.sent.length - 1];
  }
}
