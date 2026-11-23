import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** La notificación no existe en la bandeja de quien pregunta. */
export class NotificationNotFoundError extends DomainError {
  readonly code = NotificationsErrorCode.InboxNotFound;

  constructor() {
    super('The notification is not in the inbox');
  }
}
