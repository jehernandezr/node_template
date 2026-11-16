import type {
  NotificationChannel,
  NotificationType,
} from '../enums/notifications.enum.js';

/** Se creó una notificación. No lleva texto: solo lo que reports agrega. */
export interface NotificationCreatedPayload {
  notificationId: string;
  tenantId: string;
  type: NotificationType;
  /** Canales por los que salió. */
  channels: NotificationChannel[];
  createdAt: string;
}
