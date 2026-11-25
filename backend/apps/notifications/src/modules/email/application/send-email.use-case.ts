import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { Clock } from '@platform/kernel';
import { LoggerPort, RequestContextStore } from '@platform/observability';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import {
  EmailLedger,
  EmailReservationKind,
  EmailStatus,
  type EmailRecord,
} from '../domain/email-ledger.js';
import {
  EmailInProgressError,
  RecipientSuppressedError,
  TemplateUnknownError,
} from '../domain/email.error.js';
import { EmailSender } from '../domain/email-sender.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';
import type { RenderedEmail } from '../domain/rendered-email.js';
import { EmailTemplates } from '../domain/templates/email-templates.js';
import { EmailFacade } from './email.facade.js';
import type { EmailRequest } from './email-request.js';

/**
 * Arma y envía un correo una sola vez por `messageId`. El `messageId` se reserva en el registro antes de entregarlo al
 * proveedor: un reintento mientras el primero sigue en curso responde `EmailInProgressError` (reintentable) y uno
 * posterior devuelve el id del proveedor sin volver a enviar, así el destinatario no recibe dos códigos. Una reserva
 * que quedó en `Sending` más de `ABANDONED_AFTER_MS` es de un proceso que cayó y se vuelve a tomar.
 */
@Injectable()
export class SendEmail extends EmailFacade {
  static readonly ABANDONED_AFTER_MS = 2 * 60_000;

  private readonly from: string;

  constructor(
    private readonly sender: EmailSender,
    private readonly ledger: EmailLedger,
    private readonly fingerprint: RecipientFingerprint,
    private readonly templates: EmailTemplates,
    private readonly context: RequestContextStore,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
    config: AppConfig,
  ) {
    super();
    this.from = config.root<NotificationsConfig>().NOTIFICATIONS_FROM_ADDRESS;
  }

  /**
   * @throws RecipientSuppressedError, TemplateUnknownError, TemplateParameterMissingError o EmailInProgressError.
   */
  async send(request: EmailRequest): Promise<string> {
    const recipientHash = this.fingerprint.of(request.to);
    if (await this.ledger.isSuppressed(recipientHash)) {
      throw new RecipientSuppressedError();
    }
    const template = this.templates.find(request.template);
    if (template === undefined) {
      throw new TemplateUnknownError(request.template);
    }
    const rendered = template.render(request.parameters, request.locale);
    const traceId = this.context.current()?.traceId;
    const entry = {
      messageId: request.messageId,
      template: template.key,
      templateVersion: template.version,
      recipientHash,
      ...(traceId === undefined ? {} : { traceId }),
    };
    const reservation = await this.ledger.reserve(
      entry,
      new Date(this.clock.now().getTime() - SendEmail.ABANDONED_AFTER_MS),
    );
    if (reservation.kind === EmailReservationKind.Taken) {
      return SendEmail.alreadySent(reservation.current);
    }
    return this.deliver(request.to, rendered, entry);
  }

  /** Entrega lo reservado. Un fallo del proveedor libera la reserva; uno del registro no deshace un envío hecho. */
  private async deliver(
    to: string,
    rendered: RenderedEmail,
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
  ): Promise<string> {
    let providerId: string;
    try {
      providerId = await this.sender.send({ from: this.from, to, ...rendered });
    } catch (error) {
      await this.release(entry);
      throw error;
    }
    try {
      await this.ledger.record({
        ...entry,
        status: EmailStatus.Sent,
        providerId,
      });
    } catch (error) {
      this.logger.warn('email sent but not recorded', {
        messageId: entry.messageId,
        error,
      });
    }
    return providerId;
  }

  private async release(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
  ): Promise<void> {
    try {
      await this.ledger.record({ ...entry, status: EmailStatus.Failed });
    } catch (error) {
      this.logger.warn('failed email reservation not released', {
        messageId: entry.messageId,
        error,
      });
    }
  }

  private static alreadySent(current: EmailRecord): string {
    if (current.status !== EmailStatus.Sent) {
      throw new EmailInProgressError();
    }
    return current.providerId ?? '';
  }
}
