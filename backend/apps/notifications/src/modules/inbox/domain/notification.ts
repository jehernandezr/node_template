import type {
  AppNotification,
  NotificationType,
} from '@contracts/notifications';

/** Una notificación de la bandeja de un usuario. */
export interface NotificationState {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly locale: string;
  readonly createdAt: Date;
  readonly readAt?: Date;
}

/** Cómo sale una notificación de la bandeja por el contrato. Utilidad pura. */
export class NotificationViews {
  static of(state: NotificationState): AppNotification {
    return {
      id: state.id,
      type: state.type,
      title: state.title,
      body: state.body,
      createdAt: state.createdAt.toISOString(),
      read: state.readAt !== undefined,
    };
  }
}
