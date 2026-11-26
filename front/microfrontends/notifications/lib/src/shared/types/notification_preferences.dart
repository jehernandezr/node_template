import '../constants/notifications_api.dart';
import '../enums/notification_enums.dart';
import 'clock_time.dart';

/// Preferences by type and channel, with quiet hours in [timezone] (an IANA
/// zone such as `America/Bogota`).
///
/// Mandatory combinations (security alerts) are always on; [withChannel]
/// ignores them.
final class NotificationPreferences {
  /// Preferences with the channels of each type and the quiet hours.
  NotificationPreferences({
    required Map<NotificationType, Set<NotificationChannel>> enabled,
    required this.quietStart,
    required this.quietEnd,
    this.timezone = NotificationsApi.defaultTimezone,
  }) : enabled = Map.unmodifiable({
         for (final type in NotificationType.values)
           type: Set.unmodifiable(
             enabled[type] ?? const <NotificationChannel>{},
           ),
       });

  /// Initial preferences of a new account.
  factory NotificationPreferences.defaults() => NotificationPreferences(
    enabled: const {
      NotificationType.taskUpdated: {
        NotificationChannel.inApp,
        NotificationChannel.push,
      },
      NotificationType.invoiceIssued: {
        NotificationChannel.inApp,
        NotificationChannel.email,
      },
      NotificationType.accountActivity: {NotificationChannel.inApp},
    },
    quietStart: const ClockTime(22, 0),
    quietEnd: const ClockTime(7, 0),
  );

  /// Channels enabled for each notification type.
  final Map<NotificationType, Set<NotificationChannel>> enabled;

  /// Start of the quiet hours.
  final ClockTime quietStart;

  /// End of the quiet hours.
  final ClockTime quietEnd;

  /// IANA zone of the quiet hours.
  final String timezone;

  /// Whether [channel] is enabled for [type].
  bool isEnabled(NotificationType type, NotificationChannel channel) =>
      type.isMandatory || (enabled[type]?.contains(channel) ?? false);

  /// New preferences with [channel] on or off for [type]. Returns these same
  /// preferences when the combination is mandatory.
  NotificationPreferences withChannel(
    NotificationType type,
    NotificationChannel channel,
    bool on,
  ) {
    if (type.isMandatory) return this;
    final channels = {...?enabled[type]};
    on ? channels.add(channel) : channels.remove(channel);
    return NotificationPreferences(
      enabled: {...enabled, type: channels},
      quietStart: quietStart,
      quietEnd: quietEnd,
      timezone: timezone,
    );
  }

  /// Copies the preferences with other quiet hours.
  NotificationPreferences withQuietHours({ClockTime? start, ClockTime? end}) =>
      NotificationPreferences(
        enabled: enabled,
        quietStart: start ?? quietStart,
        quietEnd: end ?? quietEnd,
        timezone: timezone,
      );
}
