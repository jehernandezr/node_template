import 'package:contracts/contracts.dart' as api;

import '../shared/types/types.dart';

/// Converts between the types of the notifications contract and the ones the
/// screens use.
abstract final class NotificationsMapper {
  /// Maps the contract notification to the UI one.
  static AppNotification notification(api.AppNotification notification) =>
      AppNotification(
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        read: notification.read,
      );

  /// Throws [FormatException] when a quiet hour is not `HH:mm`.
  static NotificationPreferences preferences(
    api.NotificationPreferences preferences,
  ) => NotificationPreferences(
    enabled: {
      for (final entry in preferences.enabled)
        entry.type: entry.channels.toSet(),
    },
    quietStart: ClockTime.parse(preferences.quietStart),
    quietEnd: ClockTime.parse(preferences.quietEnd),
    timezone: preferences.timezone,
  );

  /// Maps the UI preferences to the contract request.
  static api.NotificationPreferences preferencesRequest(
    NotificationPreferences preferences,
  ) => api.NotificationPreferences(
    enabled: [
      for (final type in NotificationType.values)
        api.NotificationPreferenceEntry(
          type: type,
          channels: [
            for (final channel in NotificationChannel.values)
              if (preferences.isEnabled(type, channel)) channel,
          ],
        ),
    ],
    quietStart: '${preferences.quietStart}',
    quietEnd: '${preferences.quietEnd}',
    timezone: preferences.timezone,
  );
}
