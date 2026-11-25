import 'package:contracts/contracts.dart'
    show
        CreateReportRunRequest,
        ReportFormat,
        ReportGranularity,
        ReportParams,
        ReportType;

/// Requests the tests queue runs with.
abstract final class ReportRequests {
  static const CreateReportRunRequest tasksCsv = CreateReportRunRequest(
    type: ReportType.tasksByStatus,
    format: ReportFormat.csv,
    params: ReportParams(
      from: '2026-11-01',
      to: '2026-11-07',
      granularity: ReportGranularity.day,
    ),
  );
}
