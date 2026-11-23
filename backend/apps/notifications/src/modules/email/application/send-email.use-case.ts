import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { RequestContextStore } from '@platform/observability';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { EmailLedger, EmailStatus } from '../domain/email-ledger.js';
import {
  RecipientSuppressedError,
  TemplateUnknownError,
} from '../domain/email.error.js';
import { EmailSender } from '../domain/email-sender.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';
import { EmailTemplates } from '../domain/templates/email-templates.js';
import { EmailFacade } from './email.facade.js';
import type { EmailRequest } from './email-request.js';

/**
 * Arma y envía un correo. Un `messageId` ya enviado devuelve el id del proveedor sin volver a enviar: el
 * llamador puede reintentar sin que el destinatario reciba dos veces el mismo código.
 */
@Injectable()
export class SendEmail extends EmailFacade {
  private readonly from: string;

  constructor(
    private readonly sender: EmailSender,
    private readonly ledger: EmailLedger,
    private readonly fingerprint: RecipientFingerprint,
    private readonly templates: EmailTemplates,
    private readonly context: RequestContextStore,
    config: AppConfig,
  ) {
    super();
    this.from = config.root<NotificationsConfig>().NOTIFICATIONS_FROM_ADDRESS;
  }

  async send(request: EmailRequest): Promise<string> {
    const previous = await this.ledger.find(request.messageId);
    if (previous?.status === EmailStatus.Sent) {
      return previous.providerId ?? '';
    }
    const recipientHash = this.fingerprint.of(request.to);
    if (await this.ledger.isSuppressed(recipientHash)) {
      throw new RecipientSuppressedError();
    }
    const template = this.templates.find(request.template);
    if (template === undefined) {
      throw new TemplateUnknownError(request.template);
    }
    const rendered = template.render(request.parameters, request.locale);
    const entry = {
      messageId: request.messageId,
      template: template.key,
      templateVersion: template.version,
      recipientHash,
      traceId: this.context.current()?.traceId,
    };
    try {
      const providerId = await this.sender.send({
        from: this.from,
        to: request.to,
        ...rendered,
      });
      await this.ledger.record({
        ...entry,
        status: EmailStatus.Sent,
        providerId,
      });
      return providerId;
    } catch (error) {
      await this.ledger.record({ ...entry, status: EmailStatus.Failed });
      throw error;
    }
  }
}
