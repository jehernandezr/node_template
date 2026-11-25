import type {
  NotificationType,
  TemplateParameter,
} from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';

/** Notifies a user. `notificationId` makes the notice idempotent: repeating it does not deliver it again. */
export interface NotifyCommand {
  readonly notificationId: string;
  readonly user: UserRef;
  readonly tenantId: string;
  readonly type: NotificationType;
  readonly parameters: ReadonlyMap<TemplateParameter, string>;
}
