// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../tasks/schemas/tasks_schemas.dart';
import '../../tasks/types/tasks_types.dart';

/// Events published by the `tasks` contract.
abstract final class TasksEvents {
  /// A task was created in a tenant.
  ///
  /// `tasks.task.created.v1`
  static const taskCreated = MessageDescriptor<TaskCreatedPayload>(
    type: 'tasks.task.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskCreatedPayloadSchema.validateIncoming,
    decodePayload: TaskCreatedPayload.fromJson,
  );

  /// A task was changed: modified fields, previous and new status, who changed it and who created it.
  ///
  /// `tasks.task.updated.v1`
  static const taskUpdated = MessageDescriptor<TaskUpdatedPayload>(
    type: 'tasks.task.updated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskUpdatedPayloadSchema.validateIncoming,
    decodePayload: TaskUpdatedPayload.fromJson,
  );

  /// A task was deleted (soft delete).
  ///
  /// `tasks.task.deleted.v1`
  static const taskDeleted = MessageDescriptor<TaskDeletedPayload>(
    type: 'tasks.task.deleted.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskDeletedPayloadSchema.validateIncoming,
    decodePayload: TaskDeletedPayload.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[
    taskCreated,
    taskUpdated,
    taskDeleted,
  ];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
