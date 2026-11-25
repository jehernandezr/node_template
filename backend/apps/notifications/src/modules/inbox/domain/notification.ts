import type {
  AppNotification,
  NotificationType,
} from '@contracts/notifications';

/** A notification in a user's inbox. */
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

/** How an inbox notification goes out through the contract. Pure utility. */
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
