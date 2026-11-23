import { Injectable } from '@nestjs/common';
import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../domain/identity-mailer.js';
import type { OutgoingEmail } from '../domain/outgoing-email.js';

/**
 * Correo en memoria (`IDENTITY_MAILER=memory`): guarda los últimos envíos para que las pruebas de extremo a
 * extremo lean los códigos y enlaces. Es el modo por defecto y no envía nada: un ambiente real usa
 * `notifications`.
 */
@Injectable()
export class MemoryIdentityMailer extends IdentityMailer {
  private static readonly KEPT = 200;
  private readonly outbox: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<void> {
    this.outbox.push(email);
    if (this.outbox.length > MemoryIdentityMailer.KEPT) {
      this.outbox.shift();
    }
  }

  /** El último correo de esa plantilla hacia esa dirección. */
  lastTo(
    to: string,
    template: IdentityEmailTemplate,
  ): OutgoingEmail | undefined {
    return [...this.outbox]
      .reverse()
      .find((email) => email.to === to && email.template === template);
  }

  sent(): readonly OutgoingEmail[] {
    return this.outbox;
  }
}
