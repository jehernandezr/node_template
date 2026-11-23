import type { OutgoingEmail } from '../../domain/outgoing-email.js';
import { EmailSender } from '../../domain/email-sender.js';

/** Modo sin proveedor: guarda los correos en el proceso. Sirve en local sin Mailpit y en las pruebas. */
export class InMemoryEmailSender extends EmailSender {
  readonly sent: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<string> {
    this.sent.push(email);
    return `memory-${this.sent.length}`;
  }
}
