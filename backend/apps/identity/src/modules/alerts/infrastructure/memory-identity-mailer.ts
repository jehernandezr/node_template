import { Injectable } from '@nestjs/common';
import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../domain/identity-mailer.js';
import type { OutgoingEmail } from '../domain/outgoing-email.js';

/**
 * In-memory mailer (`IDENTITY_MAILER=memory`): keeps the latest sends so the end-to-end tests
 * can read the codes and links. It is the default mode and sends nothing: a real environment uses
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

  /** The last email of that template to that address. */
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
