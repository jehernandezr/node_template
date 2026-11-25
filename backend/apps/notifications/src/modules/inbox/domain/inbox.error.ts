import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** The notification does not exist in the requester's inbox. */
export class NotificationNotFoundError extends DomainError {
  readonly code = NotificationsErrorCode.InboxNotFound;

  constructor() {
    super('The notification is not in the inbox');
  }
}
