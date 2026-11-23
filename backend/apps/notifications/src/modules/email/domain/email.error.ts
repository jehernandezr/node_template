import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** El destinatario está en la lista de supresión: un rebote o una queja anterior pidió no escribirle. */
export class RecipientSuppressedError extends DomainError {
  readonly code = NotificationsErrorCode.EmailRecipientSuppressed;

  constructor() {
    super('The recipient is suppressed');
  }
}

/** Nadie registró una plantilla con esa llave. */
export class TemplateUnknownError extends DomainError {
  readonly code = NotificationsErrorCode.EmailTemplateUnknown;

  constructor(template: string) {
    super('Unknown email template', { template });
  }
}
