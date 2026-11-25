import 'package:contracts/contracts.dart' show ReportRunStatus;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/screens/report_run_controller.dart';
import 'package:mf_reports/src/shared/enums/reports_enums.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:mf_reports/src/shared/types/report_run_not_found_exception.dart';
import 'package:mf_reports/src/shared/types/saved_report.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/recording_file_saver.dart';
import '../utils/report_requests.dart';
import '../utils/run_fixtures.dart';
import '../utils/scripted_reports_repository.dart';

void main() {
  late RecordingFileSaver saver;

  setUp(() => saver = RecordingFileSaver());

  ReportRunController controllerOf(
    FakeReportsRepository repository,
    String runId,
  ) {
    final controller = ReportRunController(
      repository,
      runId: runId,
      saver: saver,
      pollInterval: Duration.zero,
    );
    addTearDown(controller.dispose);
    return controller;
  }

  test('reads a pending run again until it is ready, then stops', () async {
    final repository = FakeReportsRepository(seed: const []);
    final runId = await repository.createRun(ReportRequests.tasksCsv);
    final controller = controllerOf(repository, runId);

    await controller.start();
    final first = controller.run.valueOrNull?.status;
    final pollingAtFirst = controller.isPolling;
    await pumpEventQueue();

    expect(first, ReportRunStatus.running);
    expect(pollingAtFirst, isTrue);
    expect(controller.run.valueOrNull?.status, ReportRunStatus.ready);
    expect(controller.isPolling, isFalse);
    expect(controller.canDownload, isTrue);
  });

  test('does not read again a run that already ended', () async {
    final failed = FakeReportsRepository.demoRuns.last;
    final controller = controllerOf(FakeReportsRepository(), failed.id);

    await controller.start();

    expect(controller.run.valueOrNull?.status, ReportRunStatus.failed);
    expect(controller.isPolling, isFalse);
    expect(controller.canDownload, isFalse);
  });

  test('stops reading once disposed', () async {
    final repository = ScriptedReportsRepository();
    final controller = ReportRunController(
      repository,
      runId: 'r-1',
      saver: saver,
      pollInterval: Duration.zero,
    );
    final started = controller.start();
    repository.runReads.single.complete(
      RunFixtures.withStatus(ReportRunStatus.running),
    );
    await started;
    final pollingBefore = controller.isPolling;

    controller.dispose();
    await pumpEventQueue();

    expect(pollingBefore, isTrue);
    expect(repository.runReads, hasLength(1));
    expect(controller.isPolling, isFalse);
  });

  test('downloads the file of a ready run and says where it went', () async {
    final ready = FakeReportsRepository.demoRuns.first;
    final controller = controllerOf(FakeReportsRepository(), ready.id);
    await controller.start();

    final result = await controller.download();

    final saved = (result as ActionSucceeded<SavedReport>).value;
    expect(saved.fileName, 'tasks_by_status.csv');
    expect(saved.outcome, ReportSaveOutcome.downloaded);
    expect(saver.saved.single.fileName, 'tasks_by_status.csv');
  });

  test(
    'a failed download comes back as ActionFailed and saves nothing',
    () async {
      final ready = FakeReportsRepository.demoRuns.first;
      final controller = controllerOf(
        FakeReportsRepository(
          behavior: DemoBehavior()
            ..failNext(
              const FakeFailure(),
              operation: ReportsOperation.download,
            ),
        ),
        ready.id,
      );
      await controller.start();

      expect(await controller.download(), isA<ActionFailed<SavedReport>>());
      expect(saver.saved, isEmpty);
    },
  );

  test('an unknown run ends in a ReportRunNotFoundException', () async {
    final controller = controllerOf(FakeReportsRepository(), 'missing');

    await controller.start();

    expect(
      controller.run,
      isA<AsyncError<Object>>().having(
        (state) => state.error,
        'error',
        isA<ReportRunNotFoundException>(),
      ),
    );
    expect(await controller.download(), isA<ActionSkipped<SavedReport>>());
  });

  test('an answer that arrives after dispose changes nothing', () async {
    final repository = ScriptedReportsRepository();
    final controller = ReportRunController(
      repository,
      runId: 'r-1',
      saver: saver,
      pollInterval: Duration.zero,
    );
    final started = controller.start();
    controller.dispose();
    repository.runReads.single.complete(FakeReportsRepository.demoRuns.first);
    await started;

    expect(controller.isPolling, isFalse);
  });
}
