import type { NotificationChannel } from '@contracts/notifications';

/** How the delivery of a notification through a channel ended. */
export enum DeliveryStatus {
  /** Saved with the notification and not yet attempted. */
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
  /** Failed `NotificationsDefaults.maxDeliveryAttempts` times and is no longer retried. */
  Abandoned = 'abandoned',
  /** Not delivered because the channel's sender delivers nothing (the `none` push sender); never retried. */
  Skipped = 'skipped',
}

/** What is delivered keeps its text: the retry does not depend on the inbox, which the user can empty. */
export interface Delivery {
  readonly id: string;
  readonly notificationId: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly channel: NotificationChannel;
  readonly status: DeliveryStatus;
  readonly attempts: number;
  /** Since when the job can retry it if it is still pending or failed. */
  readonly nextAttemptAt: Date;
  readonly title: string;
  readonly body: string;
  readonly locale: string;
  readonly providerId?: string;
  readonly error?: string;
}
