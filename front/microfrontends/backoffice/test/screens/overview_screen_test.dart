import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/overview_screen.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/backoffice_harness.dart';
import '../utils/gated_backoffice_repository.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _en = lookupBackofficeLocalizations(const Locale('en'));
final _sharedEs = lookupAppLocalizations(const Locale('es'));
final _sharedEn = lookupAppLocalizations(const Locale('en'));

Finder _countOf(String cardKey, String count) =>
    find.descendant(of: find.byKey(Key(cardKey)), matching: find.text(count));

void main() {
  late BackofficeHarness harness;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;

  setUp(() {
    harness = BackofficeHarness();
    behavior = DemoBehavior(clock: harness.clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
  });

  group(OverviewScreen, () {
    testWidgets('shows a loading view while the counts load', (tester) async {
      final gated = GatedBackofficeRepository(fake);
      final gate = gated.holdNext(BackofficeOperation.overview);
      await harness.pump(
        tester,
        location: '/backoffice',
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.byType(LoadingView), findsNothing);
    });

    testWidgets('shows the three counts in their cards', (tester) async {
      await harness.pump(tester, location: '/backoffice', repository: fake);

      expect(_countOf('overview-tenants', '5'), findsOneWidget);
      expect(_countOf('overview-sagas', '2'), findsOneWidget);
      expect(_countOf('overview-dlq', '15'), findsOneWidget);
      expect(find.byType(AppPage), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('a failed load shows the error and retry recovers the data', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.overview,
      );
      await harness.pump(tester, location: '/backoffice', repository: fake);

      expect(find.text(_es.loadError), findsOneWidget);
      expect(
        find.text(_sharedEs.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );
      expect(
        find.text(_sharedEs.errorTraceIdLine('trace-123')),
        findsOneWidget,
      );

      await tester.tap(find.text(_sharedEs.actionRetry));
      await tester.pumpAndSettle();

      expect(_countOf('overview-tenants', '5'), findsOneWidget);
    });

    testWidgets('shows the English labels in English', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice',
        repository: fake,
        locale: const Locale('en'),
      );

      expect(find.text(_en.cardSagas), findsOneWidget);
      expect(find.text(_es.cardSagas), findsNothing);
    });

    testWidgets('an English error shows the English error lines', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.overview,
      );
      await harness.pump(
        tester,
        location: '/backoffice',
        repository: fake,
        locale: const Locale('en'),
      );

      expect(find.text(_en.loadError), findsOneWidget);
      expect(
        find.text(_sharedEn.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );
      expect(
        find.text(_sharedEn.errorTraceIdLine('trace-123')),
        findsOneWidget,
      );
    });

    testWidgets('tapping the sagas card opens the saga list', (tester) async {
      final mounted = await harness.pump(
        tester,
        location: '/backoffice',
        repository: fake,
      );

      await tester.tap(find.byKey(const Key('overview-sagas')));
      await tester.pumpAndSettle();

      expect(mounted.location.path, '/backoffice/sagas');
      expect(find.widgetWithText(AppBar, _es.sagasTitle), findsOneWidget);
    });

    testWidgets('finance sees the tenants card and no saga or dlq card', (
      tester,
    ) async {
      await harness.pump(
        tester,
        session: harness.platformUser({PlatformRole.finance}),
        location: '/backoffice',
        repository: fake,
      );

      expect(find.byKey(const Key('overview-tenants')), findsOneWidget);
      expect(find.byKey(const Key('overview-sagas')), findsNothing);
      expect(find.byKey(const Key('overview-dlq')), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('is accessible at phone width with large text', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice',
        repository: fake,
        size: const Size(320, 800),
        textScale: 2.0,
      );

      await expectAccessible(tester);
      expect(tester.takeException(), isNull);
    });
  });
}
