import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/backoffice_harness.dart';
import 'utils/shell_pages.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));

const _queuePath = '/backoffice/dlq/notifications-tasks-events';

Finder get _sagaActions => find.byKey(const Key('saga-manual-actions'));
Finder _nav(BackofficeSection section) =>
    find.byKey(Key('backoffice-nav-${section.name}'));
Finder get _redrive => find.byKey(const Key('dlq-redrive'));

void main() {
  late BackofficeHarness harness;

  setUp(() => harness = BackofficeHarness());

  for (final role in [PlatformRole.superAdmin, PlatformRole.support]) {
    group(role.name, () {
      UserSession session() => harness.platformUser({role});

      testWidgets('sees saga actions', (tester) async {
        await harness.pump(
          tester,
          session: session(),
          location: '/backoffice/sagas/s-102',
        );
        expect(_sagaActions, findsOneWidget);
        expect(find.byKey(const Key('saga-action-retryStep')), findsOneWidget);
      });

      testWidgets('sees the DLQ redrive', (tester) async {
        await harness.pump(tester, session: session(), location: _queuePath);
        expect(_redrive, findsOneWidget);
      });

      testWidgets('sees every section and overview card', (tester) async {
        await harness.pump(tester, session: session(), location: '/backoffice');
        expect(find.byKey(const Key('overview-sagas')), findsOneWidget);
        expect(find.byKey(const Key('overview-dlq')), findsOneWidget);
        expect(_nav(BackofficeSection.sagas), findsOneWidget);
      });
    });
  }

  group('readOnly', () {
    UserSession session() => harness.platformUser({PlatformRole.readOnly});

    testWidgets('reads a saga but has no actions', (tester) async {
      await harness.pump(
        tester,
        session: session(),
        location: '/backoffice/sagas/s-102',
      );
      expect(find.text(_es.sagaDetailTitle), findsOneWidget);
      expect(find.text(_es.sagaSteps), findsOneWidget);
      expect(_sagaActions, findsNothing);
    });

    testWidgets('reads a DLQ queue but cannot redrive', (tester) async {
      await harness.pump(tester, session: session(), location: _queuePath);
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
      expect(_redrive, findsNothing);
    });
  });

  group('finance', () {
    UserSession session() => harness.platformUser({PlatformRole.finance});

    testWidgets('overview shows only the tenants card and section', (
      tester,
    ) async {
      await harness.pump(tester, session: session(), location: '/backoffice');
      expect(find.byKey(const Key('overview-tenants')), findsOneWidget);
      expect(find.byKey(const Key('overview-sagas')), findsNothing);
      expect(find.byKey(const Key('overview-dlq')), findsNothing);
      expect(_nav(BackofficeSection.tenants), findsOneWidget);
      expect(_nav(BackofficeSection.sagas), findsNothing);
      expect(_nav(BackofficeSection.dlq), findsNothing);
    });

    testWidgets('reads tenants and their plan', (tester) async {
      await harness.pump(
        tester,
        session: session(),
        location: '/backoffice/tenants/t-001',
      );
      expect(find.text(_es.tenantPlanLine('Enterprise')), findsOneWidget);
    });

    for (final path in [
      '/backoffice/sagas',
      '/backoffice/sagas/s-102',
      '/backoffice/dlq',
      _queuePath,
    ]) {
      testWidgets('is sent to forbidden from $path', (tester) async {
        final mounted = await harness.pump(
          tester,
          session: session(),
          location: path,
        );
        final location = mounted.location;
        expect(location.path, ShellPages.forbidden);
        expect(location.queryParameters['from'], path);
        expect(find.text('forbidden'), findsOneWidget);
      });
    }
  });

  group('through the shell router', () {
    testWidgets('a tenant role is forbidden', (tester) async {
      final router = await harness.pumpThroughShell(
        tester,
        session: harness.tenantUser(),
        location: '/backoffice',
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        ShellPages.forbidden,
      );
    });

    testWidgets('a platform role without a second factor steps up', (
      tester,
    ) async {
      final router = await harness.pumpThroughShell(
        tester,
        session: harness.platformUser({PlatformRole.superAdmin}, mfaAge: null),
        location: '/backoffice/sagas',
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        ShellPages.stepUp,
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.queryParameters['from'],
        '/backoffice/sagas',
      );
    });

    testWidgets('a second factor older than the window steps up', (
      tester,
    ) async {
      final router = await harness.pumpThroughShell(
        tester,
        session: harness.platformUser({
          PlatformRole.support,
        }, mfaAge: const Duration(minutes: 20)),
        location: '/backoffice',
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        ShellPages.stepUp,
      );
    });

    testWidgets('a recent second factor opens the backoffice', (tester) async {
      final router = await harness.pumpThroughShell(
        tester,
        session: harness.platformUser({PlatformRole.finance}),
        location: '/backoffice/tenants',
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        '/backoffice/tenants',
      );
      expect(find.text(_es.tenantsTitle), findsWidgets);
    });

    testWidgets('finance with a recent second factor cannot open sagas', (
      tester,
    ) async {
      final router = await harness.pumpThroughShell(
        tester,
        session: harness.platformUser({PlatformRole.finance}),
        location: '/backoffice/sagas',
      );
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        ShellPages.forbidden,
      );
    });
  });
}
