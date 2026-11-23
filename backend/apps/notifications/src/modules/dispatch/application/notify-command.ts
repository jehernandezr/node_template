import type {
  NotificationType,
  TemplateParameter,
} from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';

/** Avisar a un usuario. `notificationId` hace idempotente el aviso: repetirlo no lo vuelve a entregar. */
export interface NotifyCommand {
  readonly notificationId: string;
  readonly user: UserRef;
  readonly tenantId: string;
  readonly type: NotificationType;
  readonly parameters: ReadonlyMap<TemplateParameter, string>;
}
