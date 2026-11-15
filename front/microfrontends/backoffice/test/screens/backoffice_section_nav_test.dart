import 'dart:ui' show Tristate;

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/backoffice_page.dart';
import 'package:mf_backoffice/src/screens/backoffice_section_nav.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Reads the selected state of the section chips through their semantics.
class _SectionProbe {
  const _SectionProbe(this.tester);

  final WidgetTester tester;

  bool isSelected(String section) =>
      tester
          .getSemantics(find.byKey(Key('backoffice-nav-$section')))
          .flagsCollection
          .isSelected ==
      Tristate.isTrue;

  bool isShown(String section) =>
      find.byKey(Key('backoffice-nav-$section')).evaluate().isNotEmpty;
}

void main() {
  late GoRouter router;

  setUp(() {
    Widget page() => const BackofficePage(title: 't', slivers: []);
    router = GoRouter(
      initialLocation: '/backoffice/sagas/s-1',
      routes: [
        GoRoute(path: '/backoffice', builder: (_, _) => page()),
        GoRoute(path: '/backoffice/tenants', builder: (_, _) => page()),
        GoRoute(path: '/backoffice/tenants/t-1', builder: (_, _) => page()),
        GoRoute(path: '/backoffice/sagas/s-1', builder: (_, _) => page()),
        GoRoute(path: '/backoffice/sagas2', builder: (_, _) => page()),
      ],
    );
  });

  tearDown(() => router.dispose());

  Future<void> pumpNav(
    WidgetTester tester, {
    required String location,
    Set<PlatformRole> roles = const {PlatformRole.superAdmin},
  }) async {
    router.go(location);
    tester.view.physicalSize = const Size(1280, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      TestApp(
        delegates: const [BackofficeLocalizations.delegate],
        session: SessionBuilder(tenantId: null).withRoles(roles).build(),
      ).wrapRouter(router),
    );
    await tester.pumpAndSettle();
  }

  group(BackofficeSectionNav, () {
    testWidgets('a saga detail selects the sagas section only', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpNav(tester, location: '/backoffice/sagas/s-1');

      final probe = _SectionProbe(tester);
      expect(probe.isSelected('sagas'), isTrue);
      expect(probe.isSelected('overview'), isFalse);
      expect(probe.isSelected('tenants'), isFalse);
      expect(probe.isSelected('dlq'), isFalse);
      handle.dispose();
    });

    testWidgets('a tenant detail selects the tenants section', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpNav(tester, location: '/backoffice/tenants/t-1');

      expect(_SectionProbe(tester).isSelected('tenants'), isTrue);
      handle.dispose();
    });

    testWidgets('the root selects the overview section', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpNav(tester, location: '/backoffice');

      expect(_SectionProbe(tester).isSelected('overview'), isTrue);
      handle.dispose();
    });

    testWidgets('a sibling that only shares a prefix does not select sagas', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await pumpNav(tester, location: '/backoffice/sagas2');

      expect(_SectionProbe(tester).isSelected('sagas'), isFalse);
      handle.dispose();
    });

    testWidgets('tapping a section navigates to its list', (tester) async {
      await pumpNav(tester, location: '/backoffice/sagas/s-1');

      await tester.tap(find.byKey(const Key('backoffice-nav-tenants')));
      await tester.pumpAndSettle();

      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        '/backoffice/tenants',
      );
    });

    testWidgets('a finance session sees only overview and tenants', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await pumpNav(
        tester,
        location: '/backoffice',
        roles: const {PlatformRole.finance},
      );
      expect(find.byKey(const Key('backoffice-nav-sagas')), findsNothing);
      expect(find.byKey(const Key('backoffice-nav-dlq')), findsNothing);
      expect(_SectionProbe(tester).isShown('tenants'), isTrue);
      await expectAccessible(tester);
      handle.dispose();
    });
  });
}
