import 'package:mf_notifications/src/shared/types/types.dart';

/// Notifications the tests build.
abstract final class NotificationFixtures {
  /// A notification with [id], unread unless [read] says otherwise.
  static AppNotification item(
    String id, {
    bool read = false,
    NotificationType type = NotificationType.taskUpdated,
  }) => AppNotification(
    id: id,
    type: type,
    title: 'Título $id',
    body: 'Cuerpo $id',
    createdAt: DateTime(2026, 11, 10),
    read: read,
  );
}
