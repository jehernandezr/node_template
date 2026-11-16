// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../tasks/schemas/tasks_schemas.dart';
import '../../tasks/types/tasks_types.dart';

/// Eventos que publica el contrato `tasks`.
abstract final class TasksEvents {
  /// Se creó una tarea en un tenant.
  ///
  /// `tasks.task.created.v1`
  static const taskCreated = MessageDescriptor<TaskCreatedPayload>(
    type: 'tasks.task.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskCreatedPayloadSchema.validateIncoming,
    decodePayload: TaskCreatedPayload.fromJson,
  );

  /// Se cambió una tarea: campos modificados, estado anterior y nuevo, quien la cambió y quien la creó.
  ///
  /// `tasks.task.updated.v1`
  static const taskUpdated = MessageDescriptor<TaskUpdatedPayload>(
    type: 'tasks.task.updated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskUpdatedPayloadSchema.validateIncoming,
    decodePayload: TaskUpdatedPayload.fromJson,
  );

  /// Se borró una tarea (borrado lógico).
  ///
  /// `tasks.task.deleted.v1`
  static const taskDeleted = MessageDescriptor<TaskDeletedPayload>(
    type: 'tasks.task.deleted.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TaskDeletedPayloadSchema.validateIncoming,
    decodePayload: TaskDeletedPayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[
    taskCreated,
    taskUpdated,
    taskDeleted,
  ];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
