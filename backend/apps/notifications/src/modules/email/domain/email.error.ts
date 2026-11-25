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

/** La plantilla nombra un dato obligatorio que no llegó: el correo no se envía incompleto. */
export class TemplateParameterMissingError extends DomainError {
  readonly code = NotificationsErrorCode.EmailTemplateParameterMissing;

  constructor(template: string, parameter: string) {
    super('A required template parameter is missing', { template, parameter });
  }
}

/** Otro envío del mismo `messageId` está en curso: se reintenta más tarde y nunca se envía en paralelo. */
export class EmailInProgressError extends DomainError {
  readonly code = NotificationsErrorCode.EmailInProgress;

  constructor() {
    super('The same email is being sent', undefined, { retryable: true });
  }
}
