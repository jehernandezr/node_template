import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/saga_detail_screen.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/backoffice_harness.dart';
import '../utils/gated_backoffice_repository.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _en = lookupBackofficeLocalizations(const Locale('en'));
final _sharedEs = lookupAppLocalizations(const Locale('es'));

const _reason = 'Customer confirmed by email';

FilledButton _confirmButton(WidgetTester tester) =>
    tester.widget<FilledButton>(find.byKey(const Key('saga-reason-confirm')));

Future<void> _openAction(WidgetTester tester, String action) async {
  await tester.tap(find.byKey(Key('saga-action-$action')));
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

  group(SagaDetailScreen, () {
    testWidgets('shows the summary, the steps and their error codes', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      expect(find.text(_es.sagaSteps), findsOneWidget);
      expect(find.text(_es.sagaStepLabel(1, 'CreateTenant')), findsOneWidget);
      expect(
        find.text(_es.sagaErrorCodeLine('BILLING.ACCOUNT.DUPLICATED')),
        findsOneWidget,
      );
      expect(find.text(_es.sagaTypeLine('TenantOnboarding')), findsOneWidget);
    });

    testWidgets('going from one saga to another shows the new one', (
      tester,
    ) async {
      final mounted = await harness.pump(
        tester,
        location: '/backoffice/sagas/s-101',
        repository: fake,
      );

      mounted.router.go('/backoffice/sagas/s-102');
      await tester.pumpAndSettle();

      expect(find.text('s-102'), findsOneWidget);
      expect(find.text('s-101'), findsNothing);
      expect(find.text(_es.sagaTenantLine('t-004')), findsOneWidget);
    });

    testWidgets('an unknown saga shows the not found message', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-999',
        repository: fake,
      );

      expect(find.text(_es.notFound), findsOneWidget);
    });

    testWidgets('confirming needs a reason and records it in the audit log', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      await _openAction(tester, 'forceCompensation');
      expect(_confirmButton(tester).onPressed, isNull);

      await tester.enterText(find.byKey(const Key('saga-reason-field')), '  ');
      await tester.pump();
      expect(_confirmButton(tester).onPressed, isNull);

      await tester.enterText(
        find.byKey(const Key('saga-reason-field')),
        _reason,
      );
      await tester.pump();
      expect(_confirmButton(tester).onPressed, isNotNull);

      await tester.tap(find.byKey(const Key('saga-reason-confirm')));
      await tester.pumpAndSettle();

      expect((await fake.saga('s-102'))?.status, SagaStatus.compensating);
      await tester.scrollUntilVisible(
        find.text(_reason),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text(_reason), findsOneWidget);
      expect(find.text(_es.sagaActionDone), findsOneWidget);
    });

    testWidgets('cancelling the dialog leaves the saga unchanged', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      await _openAction(tester, 'forceCompensation');
      await tester.tap(find.text(_sharedEs.actionCancel));
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsNothing);
      expect(
        (await fake.saga('s-102'))?.status,
        SagaStatus.requiresIntervention,
      );
    });

    testWidgets('the reason dialog is localized to English', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
        locale: const Locale('en'),
      );

      await _openAction(tester, 'forceCompensation');

      expect(find.text(_en.reasonHelp), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('an API conflict on the action shows its message', (
      tester,
    ) async {
      const code = 'PLATFORM.CONFLICT.VERSION_MISMATCH';
      behavior.failNext(
        ApiErrorException(
          ProblemDetails(
            type: 'about:blank',
            title: 'Conflict',
            status: 409,
            code: PlatformErrorCode.conflictVersionMismatch.code,
            traceId: 'trace-409',
          ),
        ),
        operation: BackofficeOperation.applySagaAction,
      );
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      await _openAction(tester, 'forceCompensation');
      await tester.enterText(
        find.byKey(const Key('saga-reason-field')),
        _reason,
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('saga-reason-confirm')));
      await tester.pumpAndSettle();

      expect(
        find.text('${errorMessage(_sharedEs, code)} ($code)'),
        findsOneWidget,
      );
      expect(find.byType(AlertDialog), findsNothing);
    });

    testWidgets(
      'a contract violation of the action shows the validation message',
      (tester) async {
        final code = PlatformErrorCode.validationInvalidInput.code;
        behavior.failNext(
          ContractViolationException(
            routeId: 'backoffice.saga.action',
            errors: [FieldError(field: 'reason', code: code)],
          ),
          operation: BackofficeOperation.applySagaAction,
        );
        await harness.pump(
          tester,
          location: '/backoffice/sagas/s-102',
          repository: fake,
        );

        await _openAction(tester, 'forceCompensation');
        await tester.enterText(
          find.byKey(const Key('saga-reason-field')),
          _reason,
        );
        await tester.pump();
        await tester.tap(find.byKey(const Key('saga-reason-confirm')));
        await tester.pumpAndSettle();

        expect(find.text(errorMessage(_sharedEs, code)), findsOneWidget);
      },
    );

    testWidgets('read-only sessions see the saga without manual actions', (
      tester,
    ) async {
      await harness.pump(
        tester,
        session: harness.platformUser({PlatformRole.readOnly}),
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      expect(find.text(_es.sagaSteps), findsOneWidget);
      expect(find.byKey(const Key('saga-manual-actions')), findsNothing);
    });

    testWidgets('shows a loading view while the saga loads', (tester) async {
      final gated = GatedBackofficeRepository(fake);
      final gate = gated.holdNext(BackofficeOperation.saga);
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.text(_es.sagaSteps), findsOneWidget);
    });

    testWidgets('a failed load shows the error and retry recovers the saga', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.saga,
      );
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
      );

      expect(find.text(_es.loadError), findsOneWidget);

      await tester.tap(find.text(_sharedEs.actionRetry));
      await tester.pumpAndSettle();

      expect(find.text(_es.sagaSteps), findsOneWidget);
    });

    testWidgets('is accessible on a desktop with large text', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
        size: const Size(1280, 1600),
        textScale: 2.0,
      );

      await expectAccessible(tester);
      expect(tester.takeException(), isNull);
    });

    testWidgets('is accessible at phone width', (tester) async {
      await harness.pump(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: fake,
        size: const Size(320, 800),
      );

      await expectAccessible(tester);
      expect(tester.takeException(), isNull);
    });
  });
}
