// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import 'package:meta/meta.dart';

import '../../core/core.dart';
import '../../platform/types/platform_types.dart';
import '../../reports/enums/reports_enums.dart';

/// A report run finished.
@immutable
final class RunCompletedPayload {
  const RunCompletedPayload({
    required this.tenantId,
    required this.runId,
    required this.type,
    required this.status,
    required this.requestedBy,
    required this.completedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RunCompletedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return RunCompletedPayload(
        tenantId: json['tenantId'] as String,
        runId: json['runId'] as String,
        type: decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        status: decodeEnum(
          json['status'],
          ReportRunStatus.tryParse,
          'ReportRunStatus',
        ),
        requestedBy: UserRef.fromJson(
          json['requestedBy'] as Map<String, dynamic>,
        ),
        completedAt: DateTime.parse(json['completedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RunCompletedPayload: $error', json);
    }
  }

  final String tenantId;

  final String runId;

  final ReportType type;

  final ReportRunStatus status;

  final UserRef requestedBy;

  final DateTime completedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'runId': runId,
    'type': type.wireCode,
    'status': status.wireCode,
    'requestedBy': requestedBy.toJson(),
    'completedAt': completedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RunCompletedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RunCompletedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(runId, other.runId) &&
          contractEquals(type, other.type) &&
          contractEquals(status, other.status) &&
          contractEquals(requestedBy, other.requestedBy) &&
          contractEquals(completedAt, other.completedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, runId, type, status, requestedBy, completedAt]);
}

/// Resumes a report run in a worker.
@immutable
final class ExecuteRunPayload {
  const ExecuteRunPayload({required this.tenantId, required this.runId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ExecuteRunPayload.fromJson(Map<String, dynamic> json) {
    try {
      return ExecuteRunPayload(
        tenantId: json['tenantId'] as String,
        runId: json['runId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ExecuteRunPayload: $error', json);
    }
  }

  final String tenantId;

  final String runId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'runId': runId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ExecuteRunPayload value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExecuteRunPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(runId, other.runId);

  @override
  int get hashCode => contractHash([tenantId, runId]);
}

/// Date range and granularity of a report.
@immutable
final class ReportParams {
  const ReportParams({
    required this.from,
    required this.to,
    required this.granularity,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportParams.fromJson(Map<String, dynamic> json) {
    try {
      return ReportParams(
        from: json['from'] as String,
        to: json['to'] as String,
        granularity: decodeEnum(
          json['granularity'],
          ReportGranularity.tryParse,
          'ReportGranularity',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportParams: $error', json);
    }
  }

  final String from;

  final String to;

  final ReportGranularity granularity;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'from': from,
    'to': to,
    'granularity': granularity.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportParams value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportParams &&
          contractEquals(from, other.from) &&
          contractEquals(to, other.to) &&
          contractEquals(granularity, other.granularity);

  @override
  int get hashCode => contractHash([from, to, granularity]);
}

/// Column of a report result.
@immutable
final class ReportColumn {
  const ReportColumn({
    required this.key,
    required this.header,
    required this.kind,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportColumn.fromJson(Map<String, dynamic> json) {
    try {
      return ReportColumn(
        key: json['key'] as String,
        header: json['header'] as String,
        kind: decodeEnum(
          json['kind'],
          ReportColumnKind.tryParse,
          'ReportColumnKind',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportColumn: $error', json);
    }
  }

  final String key;

  final String header;

  final ReportColumnKind kind;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'key': key,
    'header': header,
    'kind': kind.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportColumn value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportColumn &&
          contractEquals(key, other.key) &&
          contractEquals(header, other.header) &&
          contractEquals(kind, other.kind);

  @override
  int get hashCode => contractHash([key, header, kind]);
}

/// Row of a report result.
@immutable
final class ReportRow {
  const ReportRow({required this.cells});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportRow.fromJson(Map<String, dynamic> json) {
    try {
      return ReportRow(
        cells: [for (final e0 in json['cells'] as List<dynamic>) e0 as String],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportRow: $error', json);
    }
  }

  final List<String> cells;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'cells': cells};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportRow value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportRow && contractEquals(cells, other.cells);

  @override
  int get hashCode => contractHash([cells]);
}

/// Tabular result of a finished run.
@immutable
final class ReportResult {
  const ReportResult({required this.columns, required this.rows});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportResult.fromJson(Map<String, dynamic> json) {
    try {
      return ReportResult(
        columns: [
          for (final e0 in json['columns'] as List<dynamic>)
            ReportColumn.fromJson(e0 as Map<String, dynamic>),
        ],
        rows: [
          for (final e0 in json['rows'] as List<dynamic>)
            ReportRow.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportResult: $error', json);
    }
  }

  final List<ReportColumn> columns;

  final List<ReportRow> rows;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'columns': [for (final e0 in columns) e0.toJson()],
    'rows': [for (final e0 in rows) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportResult value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportResult &&
          contractEquals(columns, other.columns) &&
          contractEquals(rows, other.rows);

  @override
  int get hashCode => contractHash([columns, rows]);
}

/// Available report type, with its formats and granularities.
@immutable
final class ReportCatalogEntry {
  const ReportCatalogEntry({
    required this.type,
    required this.formats,
    required this.granularities,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportCatalogEntry.fromJson(Map<String, dynamic> json) {
    try {
      return ReportCatalogEntry(
        type: decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        formats: [
          for (final e0 in json['formats'] as List<dynamic>)
            ?ReportFormat.tryParse(e0 as String),
        ],
        granularities: [
          for (final e0 in json['granularities'] as List<dynamic>)
            ?ReportGranularity.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportCatalogEntry: $error', json);
    }
  }

  final ReportType type;

  final List<ReportFormat> formats;

  final List<ReportGranularity> granularities;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'type': type.wireCode,
    'formats': [for (final e0 in formats) e0.wireCode],
    'granularities': [for (final e0 in granularities) e0.wireCode],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportCatalogEntry value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportCatalogEntry &&
          contractEquals(type, other.type) &&
          contractEquals(formats, other.formats) &&
          contractEquals(granularities, other.granularities);

  @override
  int get hashCode => contractHash([type, formats, granularities]);
}

/// Catalog of reports the tenant can request.
@immutable
final class ReportCatalog {
  const ReportCatalog({required this.items});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportCatalog.fromJson(Map<String, dynamic> json) {
    try {
      return ReportCatalog(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            ReportCatalogEntry.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportCatalog: $error', json);
    }
  }

  final List<ReportCatalogEntry> items;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportCatalog value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportCatalog && contractEquals(items, other.items);

  @override
  int get hashCode => contractHash([items]);
}

/// Request for a report run.
@immutable
final class CreateReportRunRequest {
  const CreateReportRunRequest({
    required this.type,
    required this.format,
    required this.params,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateReportRunRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateReportRunRequest(
        type: decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        format: decodeEnum(
          json['format'],
          ReportFormat.tryParse,
          'ReportFormat',
        ),
        params: ReportParams.fromJson(json['params'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateReportRunRequest: $error', json);
    }
  }

  final ReportType type;

  final ReportFormat format;

  final ReportParams params;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'type': type.wireCode,
    'format': format.wireCode,
    'params': params.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateReportRunRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateReportRunRequest &&
          contractEquals(type, other.type) &&
          contractEquals(format, other.format) &&
          contractEquals(params, other.params);

  @override
  int get hashCode => contractHash([type, format, params]);
}

/// Run accepted; its result is queried by id.
@immutable
final class ReportRunCreated {
  const ReportRunCreated({required this.runId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportRunCreated.fromJson(Map<String, dynamic> json) {
    try {
      return ReportRunCreated(runId: json['runId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportRunCreated: $error', json);
    }
  }

  final String runId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'runId': runId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportRunCreated value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportRunCreated && contractEquals(runId, other.runId);

  @override
  int get hashCode => contractHash([runId]);
}

/// Report run without its result.
@immutable
final class ReportRunSummary {
  const ReportRunSummary({
    required this.id,
    required this.type,
    required this.status,
    required this.format,
    required this.params,
    required this.requestedBy,
    required this.createdAt,
    required this.completedAt,
    required this.expiresAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportRunSummary.fromJson(Map<String, dynamic> json) {
    try {
      return ReportRunSummary(
        id: json['id'] as String,
        type: decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        status: decodeEnum(
          json['status'],
          ReportRunStatus.tryParse,
          'ReportRunStatus',
        ),
        format: decodeEnum(
          json['format'],
          ReportFormat.tryParse,
          'ReportFormat',
        ),
        params: ReportParams.fromJson(json['params'] as Map<String, dynamic>),
        requestedBy: UserRef.fromJson(
          json['requestedBy'] as Map<String, dynamic>,
        ),
        createdAt: DateTime.parse(json['createdAt'] as String),
        completedAt: json['completedAt'] == null
            ? null
            : DateTime.parse(json['completedAt'] as String),
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportRunSummary: $error', json);
    }
  }

  final String id;

  final ReportType type;

  final ReportRunStatus status;

  final ReportFormat format;

  final ReportParams params;

  final UserRef requestedBy;

  final DateTime createdAt;

  final DateTime? completedAt;

  final DateTime? expiresAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'type': type.wireCode,
    'status': status.wireCode,
    'format': format.wireCode,
    'params': params.toJson(),
    'requestedBy': requestedBy.toJson(),
    'createdAt': createdAt.toUtc().toIso8601String(),
    'completedAt': switch (completedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'expiresAt': switch (expiresAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportRunSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportRunSummary &&
          contractEquals(id, other.id) &&
          contractEquals(type, other.type) &&
          contractEquals(status, other.status) &&
          contractEquals(format, other.format) &&
          contractEquals(params, other.params) &&
          contractEquals(requestedBy, other.requestedBy) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(completedAt, other.completedAt) &&
          contractEquals(expiresAt, other.expiresAt);

  @override
  int get hashCode => contractHash([
    id,
    type,
    status,
    format,
    params,
    requestedBy,
    createdAt,
    completedAt,
    expiresAt,
  ]);
}

/// Page of report runs.
@immutable
final class ReportRunPage {
  const ReportRunPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportRunPage.fromJson(Map<String, dynamic> json) {
    try {
      return ReportRunPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            ReportRunSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportRunPage: $error', json);
    }
  }

  final List<ReportRunSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportRunPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportRunPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Filters and pagination of the run listing.
@immutable
final class ListReportRunsRequest {
  const ListReportRunsRequest({this.type, this.status, this.limit, this.after});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListReportRunsRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ListReportRunsRequest(
        type: json['type'] == null
            ? null
            : decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        status: json['status'] == null
            ? null
            : decodeEnum(
                json['status'],
                ReportRunStatus.tryParse,
                'ReportRunStatus',
              ),
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListReportRunsRequest: $error', json);
    }
  }

  final ReportType? type;

  final ReportRunStatus? status;

  final int? limit;

  final String? after;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    if (type case final value?) 'type': value.wireCode,
    if (status case final value?) 'status': value.wireCode,
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListReportRunsRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListReportRunsRequest &&
          contractEquals(type, other.type) &&
          contractEquals(status, other.status) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([type, status, limit, after]);
}

/// Report run to query.
@immutable
final class GetReportRunRequest {
  const GetReportRunRequest({required this.runId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GetReportRunRequest.fromJson(Map<String, dynamic> json) {
    try {
      return GetReportRunRequest(runId: json['runId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetReportRunRequest: $error', json);
    }
  }

  final String runId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'runId': runId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GetReportRunRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetReportRunRequest && contractEquals(runId, other.runId);

  @override
  int get hashCode => contractHash([runId]);
}

/// Report run with its result, null until it is ready.
@immutable
final class ReportRunDetail {
  const ReportRunDetail({
    required this.id,
    required this.type,
    required this.status,
    required this.format,
    required this.params,
    required this.requestedBy,
    required this.createdAt,
    required this.completedAt,
    required this.expiresAt,
    required this.result,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportRunDetail.fromJson(Map<String, dynamic> json) {
    try {
      return ReportRunDetail(
        id: json['id'] as String,
        type: decodeEnum(json['type'], ReportType.tryParse, 'ReportType'),
        status: decodeEnum(
          json['status'],
          ReportRunStatus.tryParse,
          'ReportRunStatus',
        ),
        format: decodeEnum(
          json['format'],
          ReportFormat.tryParse,
          'ReportFormat',
        ),
        params: ReportParams.fromJson(json['params'] as Map<String, dynamic>),
        requestedBy: UserRef.fromJson(
          json['requestedBy'] as Map<String, dynamic>,
        ),
        createdAt: DateTime.parse(json['createdAt'] as String),
        completedAt: json['completedAt'] == null
            ? null
            : DateTime.parse(json['completedAt'] as String),
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
        result: json['result'] == null
            ? null
            : ReportResult.fromJson(json['result'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportRunDetail: $error', json);
    }
  }

  final String id;

  final ReportType type;

  final ReportRunStatus status;

  final ReportFormat format;

  final ReportParams params;

  final UserRef requestedBy;

  final DateTime createdAt;

  final DateTime? completedAt;

  final DateTime? expiresAt;

  final ReportResult? result;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'type': type.wireCode,
    'status': status.wireCode,
    'format': format.wireCode,
    'params': params.toJson(),
    'requestedBy': requestedBy.toJson(),
    'createdAt': createdAt.toUtc().toIso8601String(),
    'completedAt': switch (completedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'expiresAt': switch (expiresAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'result': switch (result) {
      final value? => value.toJson(),
      null => null,
    },
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportRunDetail value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportRunDetail &&
          contractEquals(id, other.id) &&
          contractEquals(type, other.type) &&
          contractEquals(status, other.status) &&
          contractEquals(format, other.format) &&
          contractEquals(params, other.params) &&
          contractEquals(requestedBy, other.requestedBy) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(completedAt, other.completedAt) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(result, other.result);

  @override
  int get hashCode => contractHash([
    id,
    type,
    status,
    format,
    params,
    requestedBy,
    createdAt,
    completedAt,
    expiresAt,
    result,
  ]);
}

/// Report run whose result is downloaded.
@immutable
final class DownloadReportRunRequest {
  const DownloadReportRunRequest({required this.runId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DownloadReportRunRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DownloadReportRunRequest(runId: json['runId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid DownloadReportRunRequest: $error', json);
    }
  }

  final String runId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'runId': runId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DownloadReportRunRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DownloadReportRunRequest && contractEquals(runId, other.runId);

  @override
  int get hashCode => contractHash([runId]);
}

/// Content of a report ready to download.
@immutable
final class ReportDownload {
  const ReportDownload({
    required this.fileName,
    required this.contentType,
    required this.content,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReportDownload.fromJson(Map<String, dynamic> json) {
    try {
      return ReportDownload(
        fileName: json['fileName'] as String,
        contentType: json['contentType'] as String,
        content: json['content'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ReportDownload: $error', json);
    }
  }

  final String fileName;

  final String contentType;

  final String content;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'fileName': fileName,
    'contentType': contentType,
    'content': content,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReportDownload value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportDownload &&
          contractEquals(fileName, other.fileName) &&
          contractEquals(contentType, other.contentType) &&
          contractEquals(content, other.content);

  @override
  int get hashCode => contractHash([fileName, contentType, content]);
}

/// User whose data is deleted from reports.
@immutable
final class EraseReportsUserInput {
  const EraseReportsUserInput({required this.user});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EraseReportsUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return EraseReportsUserInput(
        user: UserRef.fromJson(json['user'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseReportsUserInput: $error', json);
    }
  }

  final UserRef user;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'user': user.toJson()};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EraseReportsUserInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseReportsUserInput && contractEquals(user, other.user);

  @override
  int get hashCode => contractHash([user]);
}

/// Reports rows that stopped storing the user.
@immutable
final class EraseReportsUserResult {
  const EraseReportsUserResult({
    required this.userId,
    required this.affectedRows,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EraseReportsUserResult.fromJson(Map<String, dynamic> json) {
    try {
      return EraseReportsUserResult(
        userId: json['userId'] as String,
        affectedRows: (json['affectedRows'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseReportsUserResult: $error', json);
    }
  }

  final String userId;

  final int affectedRows;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'affectedRows': affectedRows,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EraseReportsUserResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseReportsUserResult &&
          contractEquals(userId, other.userId) &&
          contractEquals(affectedRows, other.affectedRows);

  @override
  int get hashCode => contractHash([userId, affectedRows]);
}
