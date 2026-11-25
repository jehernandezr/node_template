import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/tenant_detail_screen.dart';
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

  group(TenantDetailScreen, () {
    testWidgets('shows the plan, region, shard group, users and audit', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: '/backoffice/tenants/t-001',
        repository: repo,
      );

      expect(find.text(_es.tenantPlanLine('Enterprise')), findsOneWidget);
      expect(find.text(_es.tenantRegionLine('Europa oeste')), findsOneWidget);
      expect(
        find.text(_es.tenantShardGroupLine('shards-eu-1')),
        findsOneWidget,
      );
      expect(find.text(_es.tenantUsersLine(240)), findsOneWidget);
      expect(find.textContaining('tenant.plan_changed'), findsOneWidget);
      expect(find.text('Starter a Enterprise'), findsOneWidget);
    });

    testWidgets('going from one tenant to another shows the new one', (
      tester,
    ) async {
      final mounted = await harness.pump(
        tester,
        location: '/backoffice/tenants/t-001',
        repository: repo,
      );

      mounted.router.go('/backoffice/tenants/t-002');
      await tester.pumpAndSettle();

      expect(find.text(_es.tenantPlanLine('Starter')), findsOneWidget);
      expect(find.text(_es.tenantPlanLine('Enterprise')), findsNothing);
    });

    testWidgets('an unknown tenant shows the not found state', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/tenants/t-999',
        repository: repo,
      );

      expect(find.text(_es.notFound), findsOneWidget);
    });

    testWidgets('shows the loading view while the tenant loads', (
      tester,
    ) async {
      final gate = gated.holdNext(BackofficeOperation.tenant);
      await harness.pump(
        tester,
        location: '/backoffice/tenants/t-001',
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.text(_es.tenantPlanLine('Enterprise')), findsOneWidget);
    });

    testWidgets('an API error offers a retry that loads the tenant', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.tenant,
      );
      await harness.pump(
        tester,
        location: '/backoffice/tenants/t-001',
        repository: repo,
      );

      expect(
        find.text(_shared.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );

      await tester.tap(find.text(_shared.actionRetry));
      await tester.pumpAndSettle();
      expect(find.text(_es.tenantPlanLine('Enterprise')), findsOneWidget);
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
            location: '/backoffice/tenants/t-001',
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
