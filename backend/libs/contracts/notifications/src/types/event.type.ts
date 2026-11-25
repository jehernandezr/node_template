import type {
  NotificationChannel,
  NotificationType,
} from '../enums/notifications.enum.js';

/** A notification was created. It carries no text: only what reports aggregates. */
export interface NotificationCreatedPayload {
  notificationId: string;
  tenantId: string;
  type: NotificationType;
  /** Channels through which it went out. */
  channels: NotificationChannel[];
  createdAt: string;
}
