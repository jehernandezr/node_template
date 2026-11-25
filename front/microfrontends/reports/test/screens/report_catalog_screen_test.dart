import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_reports/mf_reports.dart';
import 'package:mf_reports/src/data/fake_reports_repository.dart';
import 'package:mf_reports/src/screens/screens.dart';
import 'package:mf_reports/src/shared/enums/reports_operation.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/reports_test_app.dart';
import '../utils/scripted_reports_repository.dart';

final _es = ReportsTestApp.es;

final _page = find.byType(Scrollable).first;

Future<void> _choose(WidgetTester tester, String report) async {
  await tester.tap(find.widgetWithText(ListTile, report));
  await tester.pumpAndSettle();
}

Future<void> _generate(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.text(_es.generate),
    200,
    scrollable: _page,
  );
  await tester.tap(find.text(_es.generate));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    await const DeferredLibrariesPreloader().load([reportsManifest]);
  });

  group(ReportCatalogScreen, () {
    testWidgets('shows a loading indicator while the catalog loads', (
      tester,
    ) async {
      await const ReportsTestApp().pumpScreen(
        tester,
        ReportCatalogScreen(repository: ScriptedReportsRepository()),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows the reports and the parameters of the chosen one', (
      tester,
    ) async {
      await const ReportsTestApp().pump(tester, FakeReportsRepository());
      await tester.pumpAndSettle();

      expect(find.text(_es.typeTasksByStatus), findsOneWidget);
      expect(find.text(_es.chooseReport), findsOneWidget);

      await _choose(tester, _es.typeInvoicesSummary);

      expect(find.text(_es.periodLabel), findsOneWidget);
      expect(find.text(_es.granularityLabel), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text(_es.generate),
        200,
        scrollable: _page,
      );
      expect(find.text(_es.formatLabel), findsOneWidget);
      expect(find.text(_es.generate), findsOneWidget);
    });

    testWidgets('generating opens the new run, which ends ready', (
      tester,
    ) async {
      await const ReportsTestApp().pump(tester, FakeReportsRepository());
      await tester.pumpAndSettle();
      await _choose(tester, _es.typeTasksActivity);
      await tester.scrollUntilVisible(
        find.text(_es.periodLast7Days),
        200,
        scrollable: _page,
      );
      await tester.tap(find.text(_es.periodLast7Days));
      await tester.pumpAndSettle();

      await _generate(tester);
      expect(find.byType(ReportRunScreen), findsOneWidget);
      expect(find.text(_es.runPending), findsOneWidget);

      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.text(_es.statusReady), findsOneWidget);
      expect(find.text(_es.runPending), findsNothing);
    });

    testWidgets('without permission to write there is no generate button', (
      tester,
    ) async {
      await const ReportsTestApp(canWrite: false)
          .pump(tester, FakeReportsRepository());
      await tester.pumpAndSettle();
      await _choose(tester, _es.typeTasksByStatus);

      await tester.scrollUntilVisible(
        find.text(_es.formatLabel),
        200,
        scrollable: _page,
      );
      expect(find.text(_es.generate), findsNothing);
    });

    testWidgets('shows the empty state when the plan has no reports', (
      tester,
    ) async {
      final repository = ScriptedReportsRepository();
      await const ReportsTestApp().pumpScreen(
        tester,
        ReportCatalogScreen(repository: repository),
      );
      repository.catalogs.single.complete(const []);
      await tester.pumpAndSettle();

      expect(find.text(_es.emptyCatalogTitle), findsOneWidget);
    });

    testWidgets('shows an error with retry when the catalog fails', (
      tester,
    ) async {
      final repository = FakeReportsRepository(
        behavior: DemoBehavior()
          ..failNext(const FakeFailure(), operation: ReportsOperation.catalog),
      );
      await const ReportsTestApp().pump(tester, repository);
      await tester.pumpAndSettle();
      expect(find.text(_es.loadError), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.text(_es.typeTasksByStatus), findsOneWidget);
    });

    testWidgets('a failed run request keeps the catalog and says so', (
      tester,
    ) async {
      final repository = FakeReportsRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: ReportsOperation.createRun,
          ),
      );
      await const ReportsTestApp().pump(tester, repository);
      await tester.pumpAndSettle();
      await _choose(tester, _es.typeTasksByStatus);

      await _generate(tester);

      expect(find.byType(ReportCatalogScreen), findsOneWidget);
      expect(find.textContaining(_es.generateError), findsOneWidget);
    });

    testWidgets('lays out at compact and wide widths', (tester) async {
      final app = const ReportsTestApp().wrap(
        ReportsTestApp.scopeWith(FakeReportsRepository()),
      );

      await pumpAtWidths(
        tester,
        app,
        widths: const [320, 1280],
        check: (width) async {
          await tester.pumpAndSettle();
          await _choose(tester, _es.typeTasksByStatus);
          expect(tester.takeException(), isNull, reason: 'width $width');
        },
      );
    });

    testWidgets('is accessible', (tester) async {
      await const ReportsTestApp().pump(tester, FakeReportsRepository());
      await tester.pumpAndSettle();
      await _choose(tester, _es.typeTasksByStatus);

      await expectAccessible(tester);
    });

    testWidgets('does not throw at twice the text scale', (tester) async {
      final app = const ReportsTestApp().wrap(
        ReportsTestApp.scopeWith(FakeReportsRepository()),
      );

      await pumpAtTextScale(tester, app);
      await tester.pumpAndSettle();
      await _choose(tester, _es.typeTasksByStatus);

      expect(tester.takeException(), isNull);
    });
  });
}
