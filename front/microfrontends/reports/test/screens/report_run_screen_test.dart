import 'package:contracts/contracts.dart' show ReportRunStatus;
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_reports/mf_reports.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/data/reports_repository.dart';
import 'package:mf_reports/src/screens/screens.dart';
import 'package:mf_reports/src/shared/constants/reports_paths.dart';
import 'package:mf_reports/src/shared/enums/reports_enums.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/recording_file_saver.dart';
import '../utils/reports_test_app.dart';
import '../utils/run_fixtures.dart';
import '../utils/scripted_reports_repository.dart';

final _es = ReportsTestApp.es;
final _ready = FakeReportsRepository.demoRuns.first;
final _failed = FakeReportsRepository.demoRuns.last;

void main() {
  setUpAll(() async {
    await const DeferredLibrariesPreloader().load([reportsManifest]);
  });

  Future<void> pumpRun(
    WidgetTester tester,
    ReportsRepository repository, {
    required String runId,
    RecordingFileSaver? saver,
  }) => const ReportsTestApp().pumpScreen(
    tester,
    ReportRunScreen(
      repository: repository,
      saver: saver ?? RecordingFileSaver(),
      runId: runId,
    ),
  );

  group(ReportRunScreen, () {
    testWidgets('shows a loading indicator while the run loads', (
      tester,
    ) async {
      await pumpRun(tester, ScriptedReportsRepository(), runId: _ready.id);

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows the rows of a ready run and downloads its file', (
      tester,
    ) async {
      final saver = RecordingFileSaver();
      await pumpRun(
        tester,
        FakeReportsRepository(),
        runId: _ready.id,
        saver: saver,
      );
      await tester.pumpAndSettle();

      expect(find.text(_es.statusReady), findsOneWidget);
      expect(find.text('Estado'), findsOneWidget);
      expect(find.text('30'), findsOneWidget);

      await tester.tap(find.byTooltip(_es.download));
      await tester.pumpAndSettle();

      expect(saver.saved.single.fileName, 'tasks_by_status.csv');
      expect(find.text(_es.downloaded('tasks_by_status.csv')), findsOneWidget);
    });

    testWidgets(
      'says the file went to the clipboard where there are no files',
      (tester) async {
        await pumpRun(
          tester,
          FakeReportsRepository(),
          runId: _ready.id,
          saver: RecordingFileSaver(outcome: ReportSaveOutcome.copied),
        );
        await tester.pumpAndSettle();

        await tester.tap(find.byTooltip(_es.download));
        await tester.pumpAndSettle();

        expect(find.text(_es.copied('tasks_by_status.csv')), findsOneWidget);
      },
    );

    testWidgets('a failed download says so and keeps the run', (tester) async {
      await pumpRun(
        tester,
        FakeReportsRepository(
          behavior: DemoBehavior()
            ..failNext(
              const FakeFailure(),
              operation: ReportsOperation.download,
            ),
        ),
        runId: _ready.id,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip(_es.download));
      await tester.pumpAndSettle();

      expect(find.textContaining(_es.downloadError), findsOneWidget);
      expect(find.text(_es.statusReady), findsOneWidget);
    });

    testWidgets('a pending run says it is being generated, without download', (
      tester,
    ) async {
      final repository = ScriptedReportsRepository();
      await pumpRun(tester, repository, runId: _ready.id);
      repository.runReads.single.complete(
        RunFixtures.withStatus(ReportRunStatus.queued),
      );
      await tester.pump();

      expect(find.text(_es.runPending), findsOneWidget);
      expect(find.byTooltip(_es.download), findsNothing);
    });

    testWidgets('a failed run says to ask for a new one', (tester) async {
      await pumpRun(tester, FakeReportsRepository(), runId: _failed.id);
      await tester.pumpAndSettle();

      expect(find.text(_es.runFailed), findsOneWidget);
      expect(find.byTooltip(_es.download), findsNothing);
    });

    testWidgets('an unknown run says it does not exist, without retry', (
      tester,
    ) async {
      await pumpRun(tester, FakeReportsRepository(), runId: 'missing');
      await tester.pumpAndSettle();

      expect(find.text(_es.runNotFound), findsOneWidget);
      expect(find.text('Reintentar'), findsNothing);
    });

    testWidgets('shows an error with retry when the run fails to load', (
      tester,
    ) async {
      await pumpRun(
        tester,
        FakeReportsRepository(
          behavior: DemoBehavior()
            ..failNext(const FakeFailure(), operation: ReportsOperation.run),
        ),
        runId: _ready.id,
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.loadError), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.text(_es.statusReady), findsOneWidget);
    });

    testWidgets('lays out at compact and wide widths', (tester) async {
      final app = const ReportsTestApp().wrap(
        ReportsTestApp.scopeWith(FakeReportsRepository()),
        location: ReportsPaths.run(_ready.id),
      );

      await pumpAtWidths(
        tester,
        app,
        widths: const [320, 1280],
        check: (width) async {
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull, reason: 'width $width');
        },
      );
    });

    testWidgets('is accessible', (tester) async {
      await pumpRun(tester, FakeReportsRepository(), runId: _ready.id);
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('does not throw at twice the text scale', (tester) async {
      final app = const ReportsTestApp().wrap(
        ReportsTestApp.scopeWith(FakeReportsRepository()),
        location: ReportsPaths.run(_ready.id),
      );

      await pumpAtTextScale(tester, app);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}
