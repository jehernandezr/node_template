import 'dart:async';

import 'package:contracts/contracts.dart'
    show
        CreateReportRunRequest,
        ReportCatalogEntry,
        ReportDownload,
        ReportRunDetail,
        ReportRunSummary;
import 'package:mf_reports/src/data/reports_repository.dart';

/// Repository whose answers finish when the test completes them, so a test
/// can keep a screen loading or answer after the controller went away.
final class ScriptedReportsRepository implements ReportsRepository {
  final List<Completer<List<ReportCatalogEntry>>> catalogs = [];
  final List<Completer<List<ReportRunSummary>>> runLists = [];
  final List<Completer<ReportRunDetail>> runReads = [];

  @override
  Future<List<ReportCatalogEntry>> catalog() => _next(catalogs);

  @override
  Future<List<ReportRunSummary>> runs() => _next(runLists);

  @override
  Future<ReportRunDetail> run(String id) => _next(runReads);

  @override
  Future<String> createRun(CreateReportRunRequest request) =>
      Completer<String>().future;

  @override
  Future<ReportDownload> download(String id) =>
      Completer<ReportDownload>().future;

  @override
  void dispose() {}

  static Future<T> _next<T>(List<Completer<T>> calls) {
    final completer = Completer<T>();
    calls.add(completer);
    return completer.future;
  }
}
