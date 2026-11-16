/// Kinds of notification. The kind sets how critical it is; the preferences
/// of the user set the channels it arrives on.
enum NotificationType {
  securityAlert,
  taskUpdated,
  invoiceIssued,
  accountActivity;

  /// Whether it always goes out on every channel, as security alerts do.
  bool get isMandatory => this == securityAlert;
}

/// Channels a notification can arrive on.
enum NotificationChannel { inApp, push, email }

/// Operations of the notifications repository. The demo repository tags each
/// call with one so a test can make a single operation fail.
enum NotificationsOperation {
  fetchInbox,
  unreadCount,
  markAsRead,
  markAllAsRead,
  fetchPreferences,
  savePreferences,
}
