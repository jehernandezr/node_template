import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/tenants_screen.dart';
import 'package:mf_backoffice/src/shared/constants/backoffice_paths.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/backoffice_harness.dart';
import '../utils/gated_backoffice_repository.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _shared = lookupAppLocalizations(const Locale('es'));

void main() {
  late BackofficeHarness harness;
  late DemoBehavior behavior;
  late FakeBackofficeRepository repo;
  late GatedBackofficeRepository gated;

  setUp(() {
    harness = BackofficeHarness();
    behavior = DemoBehavior(clock: harness.clock.now);
    repo = FakeBackofficeRepository(behavior: behavior);
    gated = GatedBackofficeRepository(repo);
  });

  group(TenantsScreen, () {
    testWidgets('searching by name keeps only the matching tenant', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );
      await tester.enterText(find.byKey(const Key('tenant-search')), 'acme');
      await tester.pumpAndSettle();

      expect(find.text('Acme Logística'), findsOneWidget);
      expect(find.text('Panadería Luna'), findsNothing);
    });

    testWidgets('region filter keeps the tenants of that region', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );
      await tester.tap(find.byKey(const Key('tenant-region-filter')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.regionSaEast).last);
      await tester.pumpAndSettle();

      expect(find.text('Panadería Luna'), findsOneWidget);
      expect(find.text('Textiles Andes'), findsOneWidget);
      expect(find.text('Acme Logística'), findsNothing);
    });

    testWidgets('status filter keeps only the suspended tenant', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );
      await tester.tap(find.byKey(const Key('tenant-status-filter')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.tenantStatusSuspended).last);
      await tester.pumpAndSettle();

      expect(find.text('Clínica Norte'), findsOneWidget);
      expect(find.text('Acme Logística'), findsNothing);
      expect(find.text('Panadería Luna'), findsNothing);
    });

    testWidgets('a search without matches shows the empty state', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );
      await tester.enterText(find.byKey(const Key('tenant-search')), 'zzz');
      await tester.pumpAndSettle();

      expect(find.text(_es.tenantsEmpty), findsOneWidget);
    });

    testWidgets('tapping a tenant opens its detail', (tester) async {
      final mounted = await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );
      await tester.tap(find.text('Clínica Norte'));
      await tester.pumpAndSettle();

      expect(mounted.location.path, '/backoffice/tenants/t-003');
      expect(
        find.widgetWithText(AppBar, _es.tenantDetailTitle),
        findsOneWidget,
      );
      expect(find.text('Factura vencida'), findsOneWidget);
    });

    testWidgets('shows the loading view while the list loads', (tester) async {
      final gate = gated.holdNext(BackofficeOperation.listTenants);
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.text('Acme Logística'), findsOneWidget);
    });

    testWidgets('an API error offers a retry that loads the list', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.listTenants,
      );
      await harness.pump(
        tester,
        location: BackofficePaths.tenants,
        repository: repo,
      );

      expect(
        find.text(_shared.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );
      expect(find.text(_shared.errorTraceIdLine('trace-123')), findsOneWidget);

      await tester.tap(find.text(_shared.actionRetry));
      await tester.pumpAndSettle();
      expect(find.text('Acme Logística'), findsOneWidget);
    });

    for (final (size, textScale) in [
      (const Size(320, 800), null),
      (const Size(1280, 1600), null),
      (const Size(320, 800), 2.0),
    ]) {
      testWidgets(
        'is accessible and fits at $size with text scale $textScale',
        (tester) async {
          await harness.pump(
            tester,
            location: BackofficePaths.tenants,
            repository: repo,
            size: size,
            textScale: textScale,
          );

          expect(tester.takeException(), isNull);
          await expectAccessible(tester);
        },
      );
    }
  });
}
