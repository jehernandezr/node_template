// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Report type.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportType {
  tasksByStatus('tasks_by_status'),
  tasksActivity('tasks_activity'),
  invoicesSummary('invoices_summary'),
  notificationsDelivery('notifications_delivery');

  const ReportType(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of a report run.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportRunStatus {
  queued('queued'),
  running('running'),
  ready('ready'),
  failed('failed'),
  expired('expired');

  const ReportRunStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportRunStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Format of a report.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportFormat {
  json('json'),
  csv('csv');

  const ReportFormat(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportFormat? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Time granularity of a report.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportGranularity {
  day('day'),
  week('week'),
  month('month');

  const ReportGranularity(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportGranularity? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Data type of a result column.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportColumnKind {
  text('text'),
  integer('integer'),
  date('date');

  const ReportColumnKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportColumnKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Public error codes of the `reports` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum ReportsErrorCode {
  /// The report run does not exist.
  runNotFound(
    'REPORTS.RUN.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_reports_run_not_found',
  ),

  /// The run has not finished yet: the result is not ready.
  runNotReady(
    'REPORTS.RUN.NOT_READY',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_reports_run_not_ready',
  ),

  /// The run result expired and is no longer stored. Generate the report again.
  runExpired(
    'REPORTS.RUN.EXPIRED',
    httpStatus: 410,
    retryable: false,
    messageKey: 'error_reports_run_expired',
  ),

  /// The report type does not exist.
  typeUnknown(
    'REPORTS.TYPE.UNKNOWN',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_reports_type_unknown',
  ),

  /// The date range is invalid: the end is before the start or exceeds the maximum.
  paramsInvalidRange(
    'REPORTS.PARAMS.INVALID_RANGE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_reports_params_invalid_range',
  ),

  /// The result exceeds the maximum size. Narrow the date range.
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

  /// Exact code sent by the backend, for example `REPORTS.RUN.NOT_FOUND`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static ReportsErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static ReportsErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `ReportsRoute` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsRoute {
  listCatalog('reports.catalog.list'),
  createRun('reports.run.create'),
  listRuns('reports.run.list'),
  getRun('reports.run.get'),
  downloadRun('reports.run.download');

  const ReportsRoute(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsOperation` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsOperation {
  eraseUserData('reports.user-data.erase.v1'),
  tenantMoveSync('reports.tenant-move.sync.v1'),
  tenantMoveFinalize('reports.tenant-move.finalize.v1'),
  tenantMoveAbort('reports.tenant-move.abort.v1'),
  tenantMoveSwitch('reports.tenant-move.switch.v1'),
  tenantMoveCleanup('reports.tenant-move.cleanup.v1'),
  tenantDirectoryPlace('reports.tenant-directory.place.v1'),
  tenantDirectoryRemove('reports.tenant-directory.remove.v1');

  const ReportsOperation(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsEvent` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsEvent {
  runCompleted('reports.run.completed.v1');

  const ReportsEvent(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsCommand` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsCommand {
  executeRun('reports.run.execute.v1');

  const ReportsCommand(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsCommand? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsTopic` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsTopic {
  events('reports-events');

  const ReportsTopic(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `ReportsQueue` of the `reports` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ReportsQueue {
  runs('reports-runs'),
  projections('reports-projections'),
  financeProjections('reports-finance-projections');

  const ReportsQueue(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ReportsQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
