import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@platform/observability';
import { IdentityMailer } from '../domain/identity-mailer.js';
import type { OutgoingEmail } from '../domain/outgoing-email.js';

/**
 * Development mailer (`IDENTITY_MAILER=console`): writes the send to the log so the link or code can be copied.
 * The configuration rejects it outside `NODE_ENV=development`, because the log would carry secrets.
 */
@Injectable()
export class ConsoleIdentityMailer extends IdentityMailer {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  async send(email: OutgoingEmail): Promise<void> {
    this.logger.info('identity email', { ...email });
  }
}
