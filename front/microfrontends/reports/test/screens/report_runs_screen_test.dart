import 'package:contracts/contracts.dart' show ReportRunStatus;
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_reports/mf_reports.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/screens/screens.dart';
import 'package:mf_reports/src/shared/constants/reports_paths.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/report_requests.dart';
import '../utils/reports_test_app.dart';
import '../utils/scripted_reports_repository.dart';

final _es = ReportsTestApp.es;

void main() {
  setUpAll(() async {
    await const DeferredLibrariesPreloader().load([reportsManifest]);
  });

  Future<void> pumpRuns(
    WidgetTester tester,
    FakeReportsRepository repository,
  ) => const ReportsTestApp().pump(
    tester,
    repository,
    location: ReportsPaths.runs,
  );

  group(ReportRunsScreen, () {
    testWidgets('shows a loading indicator while the runs load', (
      tester,
    ) async {
      await const ReportsTestApp().pumpScreen(
        tester,
        ReportRunsScreen(repository: ScriptedReportsRepository()),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows each run with its status and opens it', (tester) async {
      await pumpRuns(tester, FakeReportsRepository());
      await tester.pumpAndSettle();

      expect(find.text(_es.statusReady), findsOneWidget);
      expect(find.text(_es.statusFailed), findsOneWidget);

      await tester.tap(find.text(_es.typeTasksByStatus));
      await tester.pumpAndSettle();
      expect(find.byType(ReportRunScreen), findsOneWidget);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.byType(ReportRunsScreen), findsOneWidget);
    });

    testWidgets('follows a pending run until it is ready', (tester) async {
      final repository = FakeReportsRepository(seed: const []);
      await repository.createRun(ReportRequests.tasksCsv);
      await pumpRuns(tester, repository);
      await tester.pumpAndSettle();
      expect(find.text(_es.statusRunning), findsOneWidget);

      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();

      expect(find.text(_es.statusReady), findsOneWidget);
      expect((await repository.runs()).single.status, ReportRunStatus.ready);
    });

    testWidgets('shows the empty state when there are no runs', (tester) async {
      await pumpRuns(tester, FakeReportsRepository(seed: const []));
      await tester.pumpAndSettle();

      expect(find.text(_es.emptyRunsTitle), findsOneWidget);
    });

    testWidgets('shows an error with retry when the runs fail', (tester) async {
      await pumpRuns(
        tester,
        FakeReportsRepository(
          behavior: DemoBehavior()
            ..failNext(const FakeFailure(), operation: ReportsOperation.runs),
        ),
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
        location: ReportsPaths.runs,
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
      await pumpRuns(tester, FakeReportsRepository());
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('does not throw at twice the text scale', (tester) async {
      final app = const ReportsTestApp().wrap(
        ReportsTestApp.scopeWith(FakeReportsRepository()),
        location: ReportsPaths.runs,
      );

      await pumpAtTextScale(tester, app);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}
