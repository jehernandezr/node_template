import 'package:contracts/contracts.dart' show NotificationType;

export 'package:contracts/contracts.dart'
    show NotificationChannel, NotificationType;

/// How critical each kind of notification is. The kind sets it; the
/// preferences of the user set the channels it arrives on.
extension NotificationTypeRules on NotificationType {
  /// Whether it always goes out on every channel, as security alerts do.
  bool get isMandatory => this == NotificationType.securityAlert;
}

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
