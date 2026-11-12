/// Tipos de notificación. El tipo define la criticidad; las preferencias
/// del usuario definen los canales por los que llega.
enum NotificationType {
  securityAlert,
  taskUpdated,
  invoiceIssued,
  accountActivity;

  /// Las alertas de seguridad salen siempre por todos los canales.
  bool get isMandatory => this == securityAlert;
}

/// Canales por los que puede llegar una notificación.
enum NotificationChannel { inApp, push, email }

/// Hora del día sin fecha ni zona, por ejemplo 22:00 para el inicio del silencio.
final class ClockTime {
  const ClockTime(this.hour, this.minute)
    : assert(hour >= 0 && hour < 24),
      assert(minute >= 0 && minute < 60);

  final int hour;
  final int minute;

  @override
  bool operator ==(Object other) =>
      other is ClockTime && other.hour == hour && other.minute == minute;

  @override
  int get hashCode => Object.hash(hour, minute);

  @override
  String toString() =>
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
}

/// Notificación de la bandeja.
final class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
  });

  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;

  AppNotification copyWith({bool? read}) => AppNotification(
    id: id,
    type: type,
    title: title,
    body: body,
    createdAt: createdAt,
    read: read ?? this.read,
  );
}

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
