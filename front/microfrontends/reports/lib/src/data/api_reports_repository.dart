import 'package:api/api.dart';
import 'package:contracts/contracts.dart' as api;

import '../shared/constants/reports_demo.dart';
import '../shared/types/report_run_not_found_exception.dart';
import 'reports_repository.dart';

/// [ReportsRepository] over the reports API, with the generated
/// [api.ReportsRoutes] and [ApiClient], which validates every request before
/// it is sent. `REPORTS.RUN.NOT_FOUND` becomes [ReportRunNotFoundException].
final class ApiReportsRepository implements ReportsRepository {
  ApiReportsRepository({required this._client});

  final ApiClient _client;

  @override
  Future<List<api.ReportCatalogEntry>> catalog() async => (await _client.send(
    api.ReportsRoutes.listCatalog,
    const api.Empty(),
  )).items;

  @override
  Future<String> createRun(api.CreateReportRunRequest request) async =>
      (await _client.send(api.ReportsRoutes.createRun, request)).runId;

  @override
  Future<List<api.ReportRunSummary>> runs() async => (await _client.send(
    api.ReportsRoutes.listRuns,
    const api.ListReportRunsRequest(limit: reportsRunsPageSize),
  )).items;

  @override
  Future<api.ReportRunDetail> run(String id) => _orNotFound(
    id,
    () => _client.send(
      api.ReportsRoutes.getRun,
      api.GetReportRunRequest(runId: id),
    ),
  );

  @override
  Future<api.ReportDownload> download(String id) => _orNotFound(
    id,
    () => _client.send(
      api.ReportsRoutes.downloadRun,
      api.DownloadReportRunRequest(runId: id),
    ),
  );

  @override
  void dispose() {}

  static Future<T> _orNotFound<T>(String id, Future<T> Function() call) async {
    try {
      return await call();
    } on api.ApiErrorException catch (error) {
      if (error.problem.code == api.ReportsErrorCode.runNotFound.code) {
        throw ReportRunNotFoundException(id);
      }
      rethrow;
    }
  }
}
