import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/backoffice_page.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

void main() {
  late GoRouter router;

  setUp(() {
    router = GoRouter(
      initialLocation: '/backoffice/sagas/s-1',
      routes: [
        GoRoute(
          path: '/backoffice/sagas/s-1',
          builder: (_, _) => BackofficePage(
            title: 't',
            subtitle: 'sub',
            slivers: [
              SliverList.builder(
                itemCount: 300,
                itemBuilder: (_, i) =>
                    SizedBox(height: 50, child: Text('row $i')),
              ),
            ],
          ),
        ),
      ],
    );
  });

  tearDown(() => router.dispose());

  Future<void> pumpPage(WidgetTester tester, {required Size size}) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      TestApp(
        delegates: const [BackofficeLocalizations.delegate],
        session: SessionBuilder(tenantId: null)
            .withRoles({PlatformRole.superAdmin})
            .build(),
      ).wrapRouter(router),
    );
    await tester.pumpAndSettle();
  }

  group(BackofficePage, () {
    testWidgets('shows the title in the app bar and the subtitle', (
      tester,
    ) async {
      await pumpPage(tester, size: const Size(1280, 1600));

      expect(find.byType(AppBar), findsOneWidget);
      expect(find.widgetWithText(AppBar, 't'), findsOneWidget);
      expect(find.text('sub'), findsOneWidget);
    });

    testWidgets('builds only the rows on screen of a long list', (
      tester,
    ) async {
      await pumpPage(tester, size: const Size(1280, 1600));

      final built = find.textContaining('row ').evaluate().length;
      expect(built, greaterThan(0));
      expect(built, lessThan(60));
    });

    testWidgets('keeps its content within the wide content width', (
      tester,
    ) async {
      await pumpPage(tester, size: const Size(1280, 1600));

      expect(
        tester.getSize(find.byType(CustomScrollView)).width,
        lessThanOrEqualTo(AppLayout.wideContentWidth),
      );
    });

    testWidgets('lays out at 320 wide without an exception', (tester) async {
      await pumpPage(tester, size: const Size(320, 800));

      expect(tester.takeException(), isNull);
    });
  });
}
