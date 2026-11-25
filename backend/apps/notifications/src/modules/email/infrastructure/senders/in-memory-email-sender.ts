import type { OutgoingEmail } from '../../domain/outgoing-email.js';
import { EmailSender } from '../../domain/email-sender.js';

/** Provider-less mode: keeps emails in the process. Used locally without Mailpit and in tests. */
export class InMemoryEmailSender extends EmailSender {
  readonly sent: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<string> {
    this.sent.push(email);
    return `memory-${this.sent.length}`;
  }
}
