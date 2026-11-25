import type { Page, UserRef } from '@contracts/platform';
import type {
  EmailTemplate,
  NotificationChannel,
  NotificationType,
  TemplateParameter,
} from '../enums/notifications.enum.js';

/** Notification in a user's inbox. The server generates the text in the user's language. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export type NotificationPage = Page<AppNotification>;

/** Number of unread notifications in the inbox. */
export interface UnreadCount {
  count: number;
}

/** Marks a notification in the user's inbox as read. */
export interface MarkNotificationReadRequest {
  notificationId: string;
}

/** Channels through which the user receives a notification type. */
export interface NotificationPreferenceEntry {
  type: NotificationType;
  channels: NotificationChannel[];
}

/** User preferences: types and channels, quiet hours and time zone. */
export interface NotificationPreferences {
  enabled: NotificationPreferenceEntry[];
  /** Start time of the quiet hours, `HH:mm`. */
  quietStart: string;
  /** End time of the quiet hours, `HH:mm`. */
  quietEnd: string;
  /** IANA time zone where the quiet hours apply. */
  timezone: string;
}

/** Value that fills an email template or the text of a notification. */
export interface TemplateParameterValue {
  name: TemplateParameter;
  value: string;
}

/** Input of the operation that sends a transactional email. */
export interface SendEmailInput {
  messageId: string;
  template: EmailTemplate;
  to: string;
  locale?: string;
  parameters: TemplateParameterValue[];
}

/** Result of sending a transactional email. */
export interface SendEmailResult {
  messageId: string;
}

/** Input of the operation that notifies a user through their channels. */
export interface NotifyUserInput {
  notificationId: string;
  user: UserRef;
  tenantId: string;
  type: NotificationType;
  parameters: TemplateParameterValue[];
}

/** Result of notifying a user: the channels through which it went out. */
export interface NotifyUserResult {
  notificationId: string;
  channels: NotificationChannel[];
}

/** Input of the operation that deletes a user's notification data. */
export interface EraseNotificationsUserInput {
  user: UserRef;
}

/** Result of deleting a user's notification data. */
export interface EraseNotificationsUserResult {
  userId: string;
  affectedRows: number;
}
