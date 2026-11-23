import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { NotificationState } from '../domain/notification.js';

/** Lo que los otros módulos piden de la bandeja. */
export abstract class InboxFacade {
  /** Agrega la notificación en la transacción abierta; repetirla no la duplica. */
  abstract add(
    user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification>;

  abstract unreadCount(user: UserRef): Promise<number>;

  abstract erase(user: UserRef): Promise<number>;
}
