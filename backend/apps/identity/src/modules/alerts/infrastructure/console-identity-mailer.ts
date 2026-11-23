import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@platform/observability';
import { IdentityMailer } from '../domain/identity-mailer.js';
import type { OutgoingEmail } from '../domain/outgoing-email.js';

/**
 * Correo de desarrollo (`IDENTITY_MAILER=console`): escribe el envío en el log para copiar el enlace o el
 * código. La configuración lo rechaza fuera de `NODE_ENV=development`, porque el log llevaría secretos.
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
