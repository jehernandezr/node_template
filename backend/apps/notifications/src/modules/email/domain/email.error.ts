import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** The recipient is in the suppression list: a previous bounce or complaint asked not to write to them. */
export class RecipientSuppressedError extends DomainError {
  readonly code = NotificationsErrorCode.EmailRecipientSuppressed;

  constructor() {
    super('The recipient is suppressed');
  }
}

/** No one registered a template with that key. */
export class TemplateUnknownError extends DomainError {
  readonly code = NotificationsErrorCode.EmailTemplateUnknown;

  constructor(template: string) {
    super('Unknown email template', { template });
  }
}

/** The template names a required value that did not arrive: the email is not sent incomplete. */
export class TemplateParameterMissingError extends DomainError {
  readonly code = NotificationsErrorCode.EmailTemplateParameterMissing;

  constructor(template: string, parameter: string) {
    super('A required template parameter is missing', { template, parameter });
  }
}

/** Another send of the same `messageId` is in progress: it is retried later and never sent in parallel. */
export class EmailInProgressError extends DomainError {
  readonly code = NotificationsErrorCode.EmailInProgress;

  constructor() {
    super('The same email is being sent', undefined, { retryable: true });
  }
}
