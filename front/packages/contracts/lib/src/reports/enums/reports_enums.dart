// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Tipo de reporte.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportType {
  tasksByStatus('tasks_by_status'),
  tasksActivity('tasks_activity'),
  invoicesSummary('invoices_summary'),
  notificationsDelivery('notifications_delivery');

  const ReportType(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una ejecución de reporte.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportRunStatus {
  queued('queued'),
  running('running'),
  ready('ready'),
  failed('failed'),
  expired('expired');

  const ReportRunStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportRunStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Formato de un reporte.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportFormat {
  json('json'),
  csv('csv');

  const ReportFormat(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportFormat? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Granularidad temporal de un reporte.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportGranularity {
  day('day'),
  week('week'),
  month('month');

  const ReportGranularity(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportGranularity? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Tipo de dato de una columna del resultado.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportColumnKind {
  text('text'),
  integer('integer'),
  date('date');

  const ReportColumnKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportColumnKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Códigos de error públicos del contrato `reports`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum ReportsErrorCode {
  /// La ejecución del reporte no existe.
  runNotFound(
    'REPORTS.RUN.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_reports_run_not_found',
  ),

  /// La ejecución todavía no termina: el resultado no está listo.
  runNotReady(
    'REPORTS.RUN.NOT_READY',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_reports_run_not_ready',
  ),

  /// El resultado de la ejecución venció y ya no se guarda. Genera el reporte de nuevo.
  runExpired(
    'REPORTS.RUN.EXPIRED',
    httpStatus: 410,
    retryable: false,
    messageKey: 'error_reports_run_expired',
  ),

  /// El tipo de reporte no existe.
  typeUnknown(
    'REPORTS.TYPE.UNKNOWN',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_reports_type_unknown',
  ),

  /// El rango de fechas es inválido: el fin es anterior al inicio o supera el máximo.
  paramsInvalidRange(
    'REPORTS.PARAMS.INVALID_RANGE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_reports_params_invalid_range',
  ),

  /// El resultado supera el tamaño máximo. Acota el rango de fechas.
  resultTooLarge(
    'REPORTS.RESULT.TOO_LARGE',
    httpStatus: 422,
    retryable: false,
    messageKey: 'error_reports_result_too_large',
  );

  const ReportsErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Código exacto que envía el backend, por ejemplo `REPORTS.RUN.NOT_FOUND`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static ReportsErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static ReportsErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `ReportsRoute` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsRoute {
  listCatalog('reports.catalog.list'),
  createRun('reports.run.create'),
  listRuns('reports.run.list'),
  getRun('reports.run.get'),
  downloadRun('reports.run.download');

  const ReportsRoute(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsOperation` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsOperation {
  eraseUserData('reports.user-data.erase.v1'),
  tenantMoveSync('reports.tenant-move.sync.v1'),
  tenantMoveFinalize('reports.tenant-move.finalize.v1'),
  tenantMoveAbort('reports.tenant-move.abort.v1'),
  tenantMoveCleanup('reports.tenant-move.cleanup.v1');

  const ReportsOperation(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsEvent` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsEvent {
  runCompleted('reports.run.completed.v1');

  const ReportsEvent(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsCommand` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsCommand {
  executeRun('reports.run.execute.v1');

  const ReportsCommand(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsCommand? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsTopic` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsTopic {
  events('reports-events');

  const ReportsTopic(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsQueue` del contrato `reports`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ReportsQueue {
  runs('reports-runs'),
  projections('reports-projections'),
  financeProjections('reports-finance-projections');

  const ReportsQueue(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ReportsQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
