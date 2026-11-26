import 'package:shell_core/shell_core.dart';

import '../shared/types/types.dart';

/// Data port of the notifications. `FakeNotificationsRepository` implements it
/// in tests and in the demo mode, and `ApiNotificationsRepository` over the
/// API in live mode.
///
/// It is a [ScopedResource]: the scope of the identity closes it with
/// [dispose], which cancels subscriptions and closes the open streams.
abstract interface class NotificationsRepository implements ScopedResource {
  /// Inbox of the user, newest first.
  Future<List<AppNotification>> fetchInbox();

  /// Number of unread notifications.
  Future<int> unreadCount();

  /// Number of unread notifications that keeps itself current. Emits the
  /// current value on listen and again on every live arrival and every read
  /// mark. Ends when the repository closes.
  Stream<int> watchUnreadCount();

  /// Marks the notification [id] read.
  Future<void> markAsRead(String id);

  /// Marks every notification read.
  Future<void> markAllAsRead();

  /// Loads the notification preferences of the user.
  Future<NotificationPreferences> fetchPreferences();

  /// Saves the notification preferences of the user.
  Future<void> savePreferences(NotificationPreferences preferences);

  /// Notifications that arrive while the app is open (server-sent events in
  /// live mode). Ends when the repository closes.
  Stream<AppNotification> live();
}
