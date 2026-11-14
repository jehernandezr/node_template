import '../enums/notification_enums.dart';
import 'clock_time.dart';

/// Preferencias por tipo y canal, con horario de silencio.
///
/// Las combinaciones obligatorias (alertas de seguridad) siempre están activas;
/// [withChannel] las ignora.
final class NotificationPreferences {
  NotificationPreferences({
    required Map<NotificationType, Set<NotificationChannel>> enabled,
    required this.quietStart,
    required this.quietEnd,
  }) : enabled = Map.unmodifiable({
         for (final type in NotificationType.values)
           type: Set.unmodifiable(
             enabled[type] ?? const <NotificationChannel>{},
           ),
       });

  /// Preferencias iniciales de una cuenta nueva.
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

  final Map<NotificationType, Set<NotificationChannel>> enabled;
  final ClockTime quietStart;
  final ClockTime quietEnd;

  bool isEnabled(NotificationType type, NotificationChannel channel) =>
      type.isMandatory || (enabled[type]?.contains(channel) ?? false);

  /// Nuevas preferencias con [channel] activo o no para [type].
  /// Devuelve estas mismas preferencias si la combinación es obligatoria.
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
    );
  }

  NotificationPreferences withQuietHours({ClockTime? start, ClockTime? end}) =>
      NotificationPreferences(
        enabled: enabled,
        quietStart: start ?? quietStart,
        quietEnd: end ?? quietEnd,
      );
}
