import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/sagas_screen.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/backoffice_harness.dart';
import '../utils/gated_backoffice_repository.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _sharedEs = lookupAppLocalizations(const Locale('es'));

Future<void> _filterBy(WidgetTester tester, String statusLabel) async {
  await tester.tap(find.byKey(const Key('saga-status-filter')));
  await tester.pumpAndSettle();
  await tester.tap(find.text(statusLabel).last);
  await tester.pumpAndSettle();
}

void main() {
  late BackofficeHarness harness;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;

  setUp(() {
    harness = BackofficeHarness();
    behavior = DemoBehavior(clock: harness.clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
  });

  group(SagasScreen, () {
    testWidgets('highlights the sagas that need a person', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
      );

      expect(
        find.byKey(const ValueKey('saga-highlight-s-102')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('saga-highlight-s-104')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('saga-s-101')), findsOneWidget);
      expect(find.text(_es.sagaIntervention), findsNWidgets(2));
    });

    testWidgets('filtering by status keeps only that status', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
      );

      await _filterBy(tester, _es.sagaStatusSuspended);

      expect(find.byKey(const ValueKey('saga-s-103')), findsOneWidget);
      expect(find.byKey(const ValueKey('saga-highlight-s-102')), findsNothing);
    });

    testWidgets('a filter without sagas shows the empty message', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
      );

      await _filterBy(tester, _es.sagaStatusCompensated);

      expect(find.text(_es.sagasEmpty), findsOneWidget);
    });

    testWidgets('tapping a saga opens its detail', (tester) async {
      final mounted = await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
      );

      await tester.tap(find.byKey(const ValueKey('saga-s-101')));
      await tester.pumpAndSettle();

      expect(mounted.location.path, '/backoffice/sagas/s-101');
    });

    testWidgets('shows a loading view while the sagas load', (tester) async {
      final gated = GatedBackofficeRepository(fake);
      final gate = gated.holdNext(BackofficeOperation.listSagas);
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('saga-s-101')), findsOneWidget);
    });

    testWidgets('a failed load shows the error and retry recovers the list', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.listSagas,
      );
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
      );

      expect(find.text(_es.loadError), findsOneWidget);

      await tester.tap(find.text(_sharedEs.actionRetry));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('saga-s-101')), findsOneWidget);
    });

    testWidgets('is accessible at phone width with large text', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas',
        repository: fake,
        size: const Size(320, 800),
        textScale: 2.0,
      );

      await expectAccessible(tester);
      expect(tester.takeException(), isNull);
    });
  });
}
