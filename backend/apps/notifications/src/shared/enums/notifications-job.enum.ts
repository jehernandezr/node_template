/** Jobs periódicos de notifications. */
export enum NotificationsJob {
  /** Borra las notificaciones leídas hace más de `NOTIFICATIONS_INBOX_RETENTION_DAYS`. */
  PurgeRead = 'notifications.purge-read',
  /** Reintenta las entregas por correo y push que fallaron. */
  RetryDeliveries = 'notifications.retry-deliveries',
}
