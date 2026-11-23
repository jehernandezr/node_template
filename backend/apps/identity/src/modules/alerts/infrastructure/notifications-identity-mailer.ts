import { Injectable } from '@nestjs/common';
import {
  EmailTemplate,
  NotificationsErrorCode,
  SendEmailOperation,
  TemplateParameter,
} from '@contracts/notifications';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { CallOutcomeKind, type CallOutcome } from '@platform/primitives';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { NotificationsUnavailableError } from '../../../shared/errors/notifications-unavailable.error.js';
import { IdentityMailer } from '../domain/identity-mailer.js';
import type { OutgoingEmail } from '../domain/outgoing-email.js';

/**
 * Correo real (`IDENTITY_MAILER=notifications`): pide el envío a notifications por la API interna, así los
 * códigos nunca pasan por el bus. Los tokens viajan como código porque la web todavía no tiene las pantallas
 * a las que apuntaría un enlace. Un destinatario suprimido (rebotó o se quejó) no recibe el correo y el caso de
 * uso responde igual que con un envío: un error revelaría qué direcciones están suprimidas.
 */
@Injectable()
export class NotificationsIdentityMailer extends IdentityMailer {
  private static readonly TEMPLATES: Readonly<
    Record<IdentityEmailTemplate, EmailTemplate>
  > = {
    [IdentityEmailTemplate.EmailVerification]: EmailTemplate.VerifyEmail,
    [IdentityEmailTemplate.EmailAlreadyRegistered]:
      EmailTemplate.EmailAlreadyRegistered,
    [IdentityEmailTemplate.PasswordReset]: EmailTemplate.PasswordReset,
    [IdentityEmailTemplate.EmailChangeConfirmation]: EmailTemplate.EmailChange,
    [IdentityEmailTemplate.MfaCode]: EmailTemplate.MfaCode,
    [IdentityEmailTemplate.MfaRecoveryLink]: EmailTemplate.MfaRecovery,
    [IdentityEmailTemplate.TenantInvitation]: EmailTemplate.Invitation,
  };

  private static readonly PARAMETERS: Readonly<
    Record<string, TemplateParameter>
  > = {
    token: TemplateParameter.Code,
    code: TemplateParameter.Code,
    tenantName: TemplateParameter.TenantName,
    availableAt: TemplateParameter.AvailableAt,
  };

  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  /** @throws NotificationsUnavailableError si notifications no confirma el envío ni lo descarta por supresión. */
  async send(email: OutgoingEmail): Promise<void> {
    const messageId = this.ids.next().toString();
    const template = NotificationsIdentityMailer.TEMPLATES[email.template];
    const outcome = await this.client.call(
      SendEmailOperation,
      {
        messageId,
        template,
        to: email.to,
        ...(email.locale === undefined ? {} : { locale: email.locale }),
        parameters: Object.entries(email.variables).map(([name, value]) => ({
          name: NotificationsIdentityMailer.parameterOf(name),
          value,
        })),
      },
      { idempotencyKey: messageId },
    );
    if (NotificationsIdentityMailer.suppressed(outcome)) {
      this.logger.info('identity email dropped: recipient suppressed', {
        messageId,
        template,
      });
      return;
    }
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new NotificationsUnavailableError(
        SendEmailOperation.id,
        outcome.kind,
      );
    }
  }

  private static suppressed(outcome: CallOutcome<unknown>): boolean {
    return (
      outcome.kind === CallOutcomeKind.BusinessError &&
      outcome.code === NotificationsErrorCode.EmailRecipientSuppressed
    );
  }

  private static parameterOf(variable: string): TemplateParameter {
    const parameter = NotificationsIdentityMailer.PARAMETERS[variable];
    if (parameter === undefined) {
      throw new Error(`Identity email variable without parameter: ${variable}`);
    }
    return parameter;
  }
}
