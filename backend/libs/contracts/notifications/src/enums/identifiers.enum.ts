/** Error codes of the notifications service. */
export enum NotificationsErrorCode {
  InboxNotFound = 'NOTIFICATIONS.INBOX.NOT_FOUND',
  PreferencesInvalidQuietHours = 'NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS',
  EmailRecipientSuppressed = 'NOTIFICATIONS.EMAIL.RECIPIENT_SUPPRESSED',
  EmailTemplateUnknown = 'NOTIFICATIONS.EMAIL.TEMPLATE_UNKNOWN',
  EmailTemplateParameterMissing = 'NOTIFICATIONS.EMAIL.TEMPLATE_PARAMETER_MISSING',
  EmailInProgress = 'NOTIFICATIONS.EMAIL.IN_PROGRESS',
  RealtimeUnauthenticated = 'NOTIFICATIONS.REALTIME.UNAUTHENTICATED',
}

/** Identifiers of the public routes of notifications. */
export enum NotificationsRoute {
  ListInbox = 'notifications.inbox.list',
  GetUnreadCount = 'notifications.inbox.unread-count',
  MarkRead = 'notifications.inbox.mark-read',
  MarkAllRead = 'notifications.inbox.mark-all-read',
  GetPreferences = 'notifications.preferences.get',
  SavePreferences = 'notifications.preferences.save',
}

/** Identifiers of the internal operations of notifications. */
export enum NotificationsOperation {
  SendMessage = 'notifications.messages.send.v1',
  NotifyUser = 'notifications.users.notify.v1',
  EraseUserData = 'notifications.user-data.erase.v1',
  TenantMoveSync = 'notifications.tenant-move.sync.v1',
  TenantMoveFinalize = 'notifications.tenant-move.finalize.v1',
  TenantMoveAbort = 'notifications.tenant-move.abort.v1',
  TenantMoveSwitch = 'notifications.tenant-move.switch.v1',
  TenantMoveCleanup = 'notifications.tenant-move.cleanup.v1',
  TenantDirectoryPlace = 'notifications.tenant-directory.place.v1',
  TenantDirectoryRemove = 'notifications.tenant-directory.remove.v1',
}

/** CloudEvents types of the events notifications publishes. */
export enum NotificationsEvent {
  NotificationCreated = 'notifications.notification.created.v1',
}

/** Topics where notifications publishes its events. */
export enum NotificationsTopic {
  Events = 'notifications-events',
}

/** Queues that notifications consumes. */
export enum NotificationsQueue {
  Triggers = 'notifications-triggers',
  RealtimeControl = 'notifications-realtime-control',
}
