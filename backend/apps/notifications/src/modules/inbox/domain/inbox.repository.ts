import type { UserRef } from '@contracts/platform';
import type { NotificationState } from './notification.js';

/** Bandeja del usuario del `ShardScope` abierto. */
export abstract class InboxRepository {
  /**
   * Agrega la notificación si su id no estaba; devuelve la que queda guardada con ese id. La fila guarda el tenant
   * de origen de `owner` para trasladarse con él.
   */
  abstract add(
    owner: UserRef,
    notification: NotificationState,
  ): Promise<NotificationState>;

  /** De la más nueva a la más antigua, después de `beforeId`. */
  abstract page(
    userId: string,
    beforeId: string | undefined,
    limit: number,
  ): Promise<readonly NotificationState[]>;

  abstract unreadCount(userId: string): Promise<number>;

  /** `false` si la notificación no existe o es de otro usuario; marcarla de nuevo no cambia la fecha. */
  abstract markRead(
    userId: string,
    notificationId: string,
    at: Date,
  ): Promise<boolean>;

  abstract markAllRead(userId: string, at: Date): Promise<void>;

  abstract erase(userId: string): Promise<number>;
}
