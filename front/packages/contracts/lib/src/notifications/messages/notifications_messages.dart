// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../notifications/schemas/notifications_schemas.dart';
import '../../notifications/types/notifications_types.dart';
import '../../platform/enums/platform_enums.dart';

/// Eventos que publica el contrato `notifications`.
abstract final class NotificationsEvents {
  /// Se creó una notificación: tenant, tipo y canales usados, sin texto. Reports lo cuenta.
  ///
  /// `notifications.notification.created.v1`
  static const notificationCreated =
      MessageDescriptor<NotificationCreatedPayload>(
        type: 'notifications.notification.created.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: NotificationCreatedPayloadSchema.validateIncoming,
        decodePayload: NotificationCreatedPayload.fromJson,
      );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[notificationCreated];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
