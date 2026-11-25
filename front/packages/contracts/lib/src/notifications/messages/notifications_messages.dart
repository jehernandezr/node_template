// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../notifications/schemas/notifications_schemas.dart';
import '../../notifications/types/notifications_types.dart';
import '../../platform/enums/platform_enums.dart';

/// Events published by the `notifications` contract.
abstract final class NotificationsEvents {
  /// A notification was created: tenant, type and channels used, without text. Reports counts it.
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

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[notificationCreated];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
