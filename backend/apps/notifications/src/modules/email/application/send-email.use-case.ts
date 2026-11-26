import { Injectable } from '@nestjs/common';
import { LoggerPort, RequestContextStore } from '@platform/observability';
import { NotificationsSettings } from '../../../config/notifications-settings.js';
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
import { LedgerRetryWait } from '../domain/ledger-retry-wait.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';
import type { RenderedEmail } from '../domain/rendered-email.js';
import { EmailTemplates } from '../domain/templates/email-templates.js';
import { EmailFacade } from './email.facade.js';
import type { EmailRequest } from './email-request.js';

/**
 * Renders and sends an email once per `messageId` while the ledger answers. The `messageId` is reserved in the ledger
 * before the email is handed to the provider: a retry while the first send is still in progress answers
 * `EmailInProgressError` (retryable) and a later one returns the provider id without sending again, so the recipient
 * does not get two codes. A reservation left in `Sending` for more than `ABANDONED_AFTER_MS` belongs to a process that
 * crashed and is taken over. The provider cannot be asked about a send by `messageId`, so if the ledger does not record
 * the send after `RECORD_ATTEMPTS` tries, spaced by `LedgerRetryWait`, a retry past that window sends it again: with
 * the ledger down, delivery is at least once.
 */
@Injectable()
export class SendEmail extends EmailFacade {
  static readonly ABANDONED_AFTER_MS = 2 * 60_000;
  static readonly RECORD_ATTEMPTS = 3;

  private readonly from: string;

  constructor(
    private readonly sender: EmailSender,
    private readonly ledger: EmailLedger,
    private readonly fingerprint: RecipientFingerprint,
    private readonly templates: EmailTemplates,
    private readonly context: RequestContextStore,
    private readonly logger: LoggerPort,
    private readonly retryWait: LedgerRetryWait,
    settings: NotificationsSettings,
  ) {
    super();
    this.from = settings.values.NOTIFICATIONS_FROM_ADDRESS;
  }

  /**
   * Sends the email unless someone already sent it with that `messageId`.
   * @param request Template, recipient, locale, parameters and `messageId`.
   * @returns The id the provider assigned, that of the first send if it was already sent.
   * @throws RecipientSuppressedError, TemplateUnknownError, TemplateParameterMissingError or EmailInProgressError.
   */
  override async send(request: EmailRequest): Promise<string> {
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
      SendEmail.ABANDONED_AFTER_MS,
    );
    if (reservation.kind === EmailReservationKind.Taken) {
      return SendEmail.alreadySent(reservation.current);
    }
    return this.deliver(request.to, rendered, entry);
  }

  /** Delivers what was reserved. A provider failure releases the reservation; a ledger one does not undo a send. */
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
    await this.recordSent({ ...entry, status: EmailStatus.Sent, providerId });
    return providerId;
  }

  private async recordSent(sent: EmailRecord): Promise<void> {
    let lastError: unknown;
    for (let retry = 0; retry < SendEmail.RECORD_ATTEMPTS; retry += 1) {
      if (retry > 0) {
        await this.retryWait.before(retry);
      }
      try {
        await this.ledger.record(sent);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    this.logger.warn('email sent but not recorded', {
      messageId: sent.messageId,
      error: lastError,
    });
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
