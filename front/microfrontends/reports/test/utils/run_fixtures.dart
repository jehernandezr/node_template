import 'package:contracts/contracts.dart' show ReportRunDetail, ReportRunStatus;
import 'package:mf_reports/src/data/fake_reports_repository.dart';

/// Runs the tests answer with.
abstract final class RunFixtures {
  /// The ready demo run, with [status] instead.
  static ReportRunDetail withStatus(ReportRunStatus status) {
    final run = FakeReportsRepository.demoRuns.first;
    return ReportRunDetail(
      id: run.id,
      type: run.type,
      status: status,
      format: run.format,
      params: run.params,
      requestedBy: run.requestedBy,
      createdAt: run.createdAt,
      completedAt: null,
      expiresAt: null,
      result: status == ReportRunStatus.ready ? run.result : null,
    );
  }
}
