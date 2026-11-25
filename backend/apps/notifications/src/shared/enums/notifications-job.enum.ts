/** notifications periodic jobs. */
export enum NotificationsJob {
  /** Deletes notifications read more than `NOTIFICATIONS_INBOX_RETENTION_DAYS` ago. */
  PurgeRead = 'notifications.purge-read',
  /** Retries the email and push deliveries that failed. */
  RetryDeliveries = 'notifications.retry-deliveries',
}
