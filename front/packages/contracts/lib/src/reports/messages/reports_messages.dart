// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../reports/schemas/reports_schemas.dart';
import '../../reports/types/reports_types.dart';

/// Eventos que publica el contrato `reports`.
abstract final class ReportsEvents {
  /// Terminó una ejecución de reporte, lista o fallida. Notifications avisa a quien la pidió.
  ///
  /// `reports.run.completed.v1`
  static const runCompleted = MessageDescriptor<RunCompletedPayload>(
    type: 'reports.run.completed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: RunCompletedPayloadSchema.validateIncoming,
    decodePayload: RunCompletedPayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[runCompleted];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}

/// Comandos que atiende el contrato `reports`.
abstract final class ReportsCommands {
  /// Ejecuta una ejecución de reporte en un worker.
  ///
  /// `reports.run.execute.v1`
  static const executeRun = MessageDescriptor<ExecuteRunPayload>(
    type: 'reports.run.execute.v1',
    kind: MessageKind.command,
    version: 1,
    validatePayload: ExecuteRunPayloadSchema.validateIncoming,
    decodePayload: ExecuteRunPayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[executeRun];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
