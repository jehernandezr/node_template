// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../reports/schemas/reports_schemas.dart';
import '../../reports/types/reports_types.dart';

/// Events published by the `reports` contract.
abstract final class ReportsEvents {
  /// A report run finished, ready or failed. Notifications tells whoever requested it.
  ///
  /// `reports.run.completed.v1`
  static const runCompleted = MessageDescriptor<RunCompletedPayload>(
    type: 'reports.run.completed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: RunCompletedPayloadSchema.validateIncoming,
    decodePayload: RunCompletedPayload.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[runCompleted];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}

/// Commands handled by the `reports` contract.
abstract final class ReportsCommands {
  /// Executes a report run in a worker.
  ///
  /// `reports.run.execute.v1`
  static const executeRun = MessageDescriptor<ExecuteRunPayload>(
    type: 'reports.run.execute.v1',
    kind: MessageKind.command,
    version: 1,
    validatePayload: ExecuteRunPayloadSchema.validateIncoming,
    decodePayload: ExecuteRunPayload.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[executeRun];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
