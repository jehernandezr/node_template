import 'package:contracts/contracts.dart' show ReportRunStatus;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/screens/report_runs_controller.dart';
import 'package:ui/ui.dart';

import '../utils/report_requests.dart';

void main() {
  test('reads the runs again while one is pending, keeping the list', () async {
    final repository = FakeReportsRepository();
    await repository.createRun(ReportRequests.tasksCsv);
    final controller = ReportRunsController(
      repository,
      pollInterval: Duration.zero,
    );
    addTearDown(controller.dispose);
    final states = <AsyncValue<Object>>[];
    controller.addListener(() => states.add(controller.runs));

    await controller.start();
    final pollingAtFirst = controller.isPolling;
    await pumpEventQueue();

    expect(pollingAtFirst, isTrue);
    expect(controller.runs.valueOrNull?.first.status, ReportRunStatus.ready);
    expect(controller.isPolling, isFalse);
    expect(states.whereType<AsyncLoading<Object>>(), hasLength(1));
  });

  test('does not read again when every run already ended', () async {
    final controller = ReportRunsController(
      FakeReportsRepository(),
      pollInterval: Duration.zero,
    );
    addTearDown(controller.dispose);

    await controller.start();

    expect(controller.runs.valueOrNull, hasLength(2));
    expect(controller.isPolling, isFalse);
  });
}
