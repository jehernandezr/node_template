import type { IdGenerator } from '@platform/kernel';
import type { Clock } from '@platform/kernel';
import { EmailSender } from '../../domain/email-sender.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';
import { MimeMessage } from './mime-message.js';
import { SmtpSession } from './smtp-session.js';

/** Servidor SMTP de destino. */
export interface SmtpEndpoint {
  readonly host: string;
  readonly port: number;
}

/**
 * Correo por SMTP sin autenticación ni TLS, para Mailpit en desarrollo. La configuración solo lo permite con
 * `NODE_ENV=development`. Una conexión por correo: el volumen local no justifica reusarlas.
 */
export class SmtpEmailSender extends EmailSender {
  private static readonly TIMEOUT_MS = 10_000;
  private static readonly READY = 250;
  private static readonly START_DATA = 354;
  private static readonly BYE = 221;

  constructor(
    private readonly endpoint: SmtpEndpoint,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {
    super();
  }

  async send(email: OutgoingEmail): Promise<string> {
    const messageId = `${this.ids.next().toString()}@${email.from.split('@')[1] ?? 'localhost'}`;
    const session = await SmtpSession.open(
      this.endpoint.host,
      this.endpoint.port,
      SmtpEmailSender.TIMEOUT_MS,
    );
    try {
      await session.command('EHLO notifications', SmtpEmailSender.READY);
      await session.command(`MAIL FROM:<${email.from}>`, SmtpEmailSender.READY);
      await session.command(`RCPT TO:<${email.to}>`, SmtpEmailSender.READY);
      await session.command('DATA', SmtpEmailSender.START_DATA);
      await session.data(
        MimeMessage.build(
          email,
          messageId,
          this.clock.now(),
          `b-${this.ids.next().toString()}`,
        ),
        SmtpEmailSender.READY,
      );
      await session.command('QUIT', SmtpEmailSender.BYE);
      return messageId;
    } finally {
      session.close();
    }
  }
}
