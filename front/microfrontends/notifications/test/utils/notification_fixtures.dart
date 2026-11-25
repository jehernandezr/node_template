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

  /// [item] as the contract sends it, with a UUIDv7 id built from [number].
  static Map<String, Object?> json(int number, {bool read = false}) => {
    'id': id(number),
    'type': 'task_updated',
    'title': 'Título $number',
    'body': 'Cuerpo $number',
    'createdAt': '2026-11-10T10:00:00.000Z',
    'read': read,
  };

  /// The UUIDv7 id that [json] gives notification number [number].
  static String id(int number) =>
      '0193f1c2-0000-7000-8000-${number.toString().padLeft(12, '0')}';
}
