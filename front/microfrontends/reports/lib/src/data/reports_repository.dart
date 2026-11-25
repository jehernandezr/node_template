import 'package:contracts/contracts.dart'
    show
        CreateReportRunRequest,
        ReportCatalogEntry,
        ReportDownload,
        ReportRunDetail,
        ReportRunSummary;
import 'package:shell_core/shell_core.dart';

/// Access to the reports of the tenant. Screens depend only on this
/// interface; `ApiReportsRepository` talks to the reports API and
/// `FakeReportsRepository` serves the demo mode.
///
/// The scope of the identity disposes it (see [ScopedResource]). Problems
/// reach the caller as `ApiErrorException`, except a run that does not exist.
abstract interface class ReportsRepository implements ScopedResource {
  /// Reports the tenant can generate, with the formats and groupings of each.
  Future<List<ReportCatalogEntry>> catalog();

  /// Queues a run of [request] and returns its id.
  Future<String> createRun(CreateReportRunRequest request);

  /// The latest runs, newest first.
  Future<List<ReportRunSummary>> runs();

  /// The run [id] with its result once it is ready.
  ///
  /// Throws `ReportRunNotFoundException` when the tenant has no such run.
  Future<ReportRunDetail> run(String id);

  /// The file of the ready run [id], in the format it was asked for.
  ///
  /// Throws `ReportRunNotFoundException` when the tenant has no such run.
  Future<ReportDownload> download(String id);
}
