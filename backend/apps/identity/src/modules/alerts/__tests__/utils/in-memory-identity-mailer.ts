import type { IdentityEmailTemplate } from '../../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../../domain/identity-mailer.js';
import type { SentEmail } from './sent-email.js';

/** Correo de identity en memoria: guarda cada envío y expone el último. */
export class InMemoryIdentityMailer extends IdentityMailer {
  readonly sent: SentEmail[] = [];

  async send(
    template: IdentityEmailTemplate,
    to: string,
    variables: Readonly<Record<string, string>>,
  ): Promise<void> {
    this.sent.push({ template, to, variables });
  }

  last(): SentEmail | undefined {
    return this.sent[this.sent.length - 1];
  }
}
