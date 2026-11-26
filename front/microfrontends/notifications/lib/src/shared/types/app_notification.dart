import '../enums/notification_enums.dart';

/// A notification of the inbox.
final class AppNotification {
  /// Notification of the inbox.
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
  });

  /// Id of the notification.
  final String id;

  /// Kind of notification.
  final NotificationType type;

  /// Title shown.
  final String title;

  /// Body shown.
  final String body;

  /// When it was created.
  final DateTime createdAt;

  /// Whether the user read it.
  final bool read;

  /// Copies the notification with another [read] state.
  AppNotification copyWith({bool? read}) => AppNotification(
    id: id,
    type: type,
    title: title,
    body: body,
    createdAt: createdAt,
    read: read ?? this.read,
  );
}
