import 'dart:convert';

import 'package:contracts/contracts.dart'
    show
        CreateReportRunRequest,
        ReportCatalogEntry,
        ReportColumn,
        ReportColumnKind,
        ReportDownload,
        ReportFormat,
        ReportGranularity,
        ReportParams,
        ReportResult,
        ReportRow,
        ReportRunDetail,
        ReportRunStatus,
        ReportRunSummary,
        ReportType,
        UserRef;
import 'package:shell_core/shell_core.dart';

import '../shared/enums/reports_operation.dart';
import '../shared/types/report_run_not_found_exception.dart';
import 'reports_repository.dart';

/// In-memory [ReportsRepository] for the demo mode and the tests. Latency and
/// programmed failures come from [DemoBehavior].
///
/// A run it queues moves one step on every read (queued, running, ready), as
/// a worker would, so the polling of the screens has something to follow.
final class FakeReportsRepository implements ReportsRepository {
  FakeReportsRepository({DemoBehavior? behavior, List<ReportRunDetail>? seed})
    : _behavior = behavior ?? DemoBehavior(),
      _runs = List.of(seed ?? demoRuns);

  /// Who asks for the demo runs.
  static const UserRef demoUser = UserRef(
    userId: '0193f1c2-0000-7000-8000-00000000d001',
    homeTenantId: '0193f1c2-0000-7000-8000-00000000d002',
  );

  /// Every report of the contract, in every format and grouping.
  static final List<ReportCatalogEntry> demoCatalog = [
    for (final type in ReportType.values)
      ReportCatalogEntry(
        type: type,
        formats: ReportFormat.values,
        granularities: ReportGranularity.values,
      ),
  ];

  /// Runs the demo starts with: one ready and one failed.
  static final List<ReportRunDetail> demoRuns = [
    _detail(
      id: '0193f1c2-0000-7000-8000-00000000e002',
      type: ReportType.tasksByStatus,
      status: ReportRunStatus.ready,
      createdAt: DateTime.utc(2026, 11, 20, 9),
    ),
    _detail(
      id: '0193f1c2-0000-7000-8000-00000000e001',
      type: ReportType.invoicesSummary,
      status: ReportRunStatus.failed,
      createdAt: DateTime.utc(2026, 11, 19, 18),
    ),
  ];

  final DemoBehavior _behavior;
  final List<ReportRunDetail> _runs;
  int _created = 0;

  /// Whether the scope already released this repository.
  bool get isDisposed => _behavior.isDisposed;

  @override
  Future<List<ReportCatalogEntry>> catalog() => _behavior.respond(
    () => List.unmodifiable(demoCatalog),
    operation: ReportsOperation.catalog,
  );

  @override
  Future<String> createRun(CreateReportRunRequest request) =>
      _behavior.respond(() {
        _created++;
        final run = ReportRunDetail(
          id: '0193f1c2-0000-7000-8000-${_created.toString().padLeft(12, '0')}',
          type: request.type,
          status: ReportRunStatus.queued,
          format: request.format,
          params: request.params,
          requestedBy: demoUser,
          createdAt: _behavior.now(),
          completedAt: null,
          expiresAt: null,
          result: null,
        );
        _runs.insert(0, run);
        return run.id;
      }, operation: ReportsOperation.createRun);

  @override
  Future<List<ReportRunSummary>> runs() => _behavior.respond(() {
    for (var index = 0; index < _runs.length; index++) {
      _runs[index] = _advance(_runs[index]);
    }
    return [for (final run in _runs) _summary(run)];
  }, operation: ReportsOperation.runs);

  @override
  Future<ReportRunDetail> run(String id) => _behavior.respond(() {
    final index = _indexOf(id);
    return _runs[index] = _advance(_runs[index]);
  }, operation: ReportsOperation.run);

  @override
  Future<ReportDownload> download(String id) => _behavior.respond(() {
    final run = _runs[_indexOf(id)];
    final result = run.result ?? const ReportResult(columns: [], rows: []);
    return switch (run.format) {
      ReportFormat.csv => ReportDownload(
        fileName: '${run.type.wireCode}.csv',
        contentType: 'text/csv',
        content: [
          result.columns.map((column) => column.key).join(','),
          for (final row in result.rows) row.cells.join(','),
        ].join('\n'),
      ),
      ReportFormat.json => ReportDownload(
        fileName: '${run.type.wireCode}.json',
        contentType: 'application/json',
        content: jsonEncode(result.toJson()),
      ),
    };
  }, operation: ReportsOperation.download);

  @override
  void dispose() => _behavior.dispose();

  int _indexOf(String id) {
    final index = _runs.indexWhere((run) => run.id == id);
    if (index < 0) throw ReportRunNotFoundException(id);
    return index;
  }

  ReportRunDetail _advance(ReportRunDetail run) => switch (run.status) {
    ReportRunStatus.queued => _withStatus(run, ReportRunStatus.running),
    ReportRunStatus.running => _withStatus(run, ReportRunStatus.ready),
    _ => run,
  };

  ReportRunDetail _withStatus(ReportRunDetail run, ReportRunStatus status) {
    final ready = status == ReportRunStatus.ready;
    return ReportRunDetail(
      id: run.id,
      type: run.type,
      status: status,
      format: run.format,
      params: run.params,
      requestedBy: run.requestedBy,
      createdAt: run.createdAt,
      completedAt: ready ? _behavior.now() : null,
      expiresAt: null,
      result: ready ? _sampleResult : null,
    );
  }

  static ReportRunSummary _summary(ReportRunDetail run) => ReportRunSummary(
    id: run.id,
    type: run.type,
    status: run.status,
    format: run.format,
    params: run.params,
    requestedBy: run.requestedBy,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    expiresAt: run.expiresAt,
  );

  static const ReportResult _sampleResult = ReportResult(
    columns: [
      ReportColumn(
        key: 'period',
        header: 'Periodo',
        kind: ReportColumnKind.date,
      ),
      ReportColumn(
        key: 'status',
        header: 'Estado',
        kind: ReportColumnKind.text,
      ),
      ReportColumn(
        key: 'count',
        header: 'Total',
        kind: ReportColumnKind.integer,
      ),
    ],
    rows: [
      ReportRow(cells: ['2026-11-17', 'open', '12']),
      ReportRow(cells: ['2026-11-17', 'done', '30']),
    ],
  );

  static ReportRunDetail _detail({
    required String id,
    required ReportType type,
    required ReportRunStatus status,
    required DateTime createdAt,
  }) => ReportRunDetail(
    id: id,
    type: type,
    status: status,
    format: ReportFormat.csv,
    params: const ReportParams(
      from: '2026-11-01',
      to: '2026-11-19',
      granularity: ReportGranularity.week,
    ),
    requestedBy: demoUser,
    createdAt: createdAt,
    completedAt: status == ReportRunStatus.ready ? createdAt : null,
    expiresAt: null,
    result: status == ReportRunStatus.ready ? _sampleResult : null,
  );
}
