import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'support/harness.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _en = lookupBackofficeLocalizations(const Locale('en'));
final _shared = lookupAppLocalizations(const Locale('es'));
final _enShared = lookupAppLocalizations(const Locale('en'));

/// Overview that never finishes loading.
class _PendingRepository extends FakeBackofficeRepository {
  final Completer<BackofficeOverview> pending = Completer();

  @override
  Future<BackofficeOverview> overview() => pending.future;
}

/// Overview that fails with an API problem until [failing] is false.
class _FailingRepository extends FakeBackofficeRepository {
  bool failing = true;

  @override
  Future<BackofficeOverview> overview() => failing
      ? Future.error(
          ApiErrorException(
            const ProblemDetails(
              type: 'about:blank',
              title: 'Internal',
              status: 500,
              code: 'PLATFORM.INTERNAL.UNEXPECTED',
              traceId: 'trace-123',
            ),
          ),
        )
      : super.overview();
}

/// Manual actions and redrive fail with an API problem.
class _ActionFailingRepository extends FakeBackofficeRepository {
  static final code = PlatformErrorCode.conflictVersionMismatch.code;

  static ApiErrorException _conflict() => ApiErrorException(
    ProblemDetails(
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      code: code,
      traceId: 'trace-409',
    ),
  );

  @override
  Future<void> applySagaAction({
    required String sagaId,
    required SagaManualAction action,
    required String reason,
  }) => Future.error(_conflict());

  @override
  Future<int> redrive(String queue) => Future.error(_conflict());
}

/// Saga actions break the contract and redrive fails without an API answer.
class _ClientFailingRepository extends FakeBackofficeRepository {
  @override
  Future<void> applySagaAction({
    required String sagaId,
    required SagaManualAction action,
    required String reason,
  }) => Future.error(
    ContractViolationException(
      routeId: 'backoffice.saga.action',
      errors: [
        FieldError(
          field: 'reason',
          code: PlatformErrorCode.validationTooLong.code,
        ),
      ],
    ),
  );

  @override
  Future<int> redrive(String queue) => Future.error(const _OfflineException());
}

final class _OfflineException implements Exception {
  const _OfflineException();
}

Future<void> _forceCompensation(WidgetTester tester, String reason) async {
  await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('saga-reason-field')), reason);
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('saga-reason-confirm')));
  await tester.pumpAndSettle();
}

void main() {
  setUp(resetDeferredPageCache);

  group('states', () {
    testWidgets('loading shows the spinner of LoadingView', (tester) async {
      final repository = _PendingRepository();
      await pumpBackoffice(
        tester,
        location: '/backoffice',
        repository: repository,
        settle: false,
      );

      expect(find.byType(LoadingView), findsOneWidget);
      expect(find.byKey(const Key('overview-tenants')), findsNothing);
      repository.pending.complete(
        const BackofficeOverview(
          tenantCount: 1,
          sagasNeedingIntervention: 0,
          deadLetterMessages: 0,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(LoadingView), findsNothing);
    });

    testWidgets('data: overview counts tenants, sagas and DLQ messages', (
      tester,
    ) async {
      await pumpBackoffice(tester, location: '/backoffice');

      String count(String key) =>
          tester.widget<Text>(find.byKey(Key(key))).data!;
      expect(count('overview-tenants'), '5');
      // s-102 (RequiresIntervention) and s-104 (CompensationFailed).
      expect(count('overview-sagas'), '2');
      // 3 notifications + 0 reports + 12 billing.
      expect(count('overview-dlq'), '15');
      // AppPage is the only top bar.
      expect(find.byType(AppPage), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('error shows the API code and trace id, and retries', (
      tester,
    ) async {
      final repository = _FailingRepository();
      await pumpBackoffice(
        tester,
        location: '/backoffice',
        repository: repository,
      );

      expect(find.text(_es.loadError), findsOneWidget);
      expect(find.text('Código: PLATFORM.INTERNAL.UNEXPECTED'), findsOneWidget);
      expect(find.text('ID de traza: trace-123'), findsOneWidget);

      repository.failing = false;
      await tester.tap(find.text(_shared.actionRetry));
      await tester.pumpAndSettle();
      expect(find.text(_es.loadError), findsNothing);
      expect(find.byKey(const Key('overview-tenants')), findsOneWidget);
    });
  });

  group('l10n from the deferred library', () {
    testWidgets('Spanish', (tester) async {
      await pumpBackoffice(tester, location: '/backoffice');
      expect(find.text(_es.cardSagas), findsOneWidget);
      expect(find.text(_es.navDlq), findsOneWidget);
      expect(find.text(_en.cardSagas), findsNothing);
    });

    testWidgets('English', (tester) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice',
        locale: const Locale('en'),
      );
      expect(find.text(_en.cardSagas), findsOneWidget);
      expect(find.text(_en.navDlq), findsOneWidget);
      expect(find.text(_es.cardSagas), findsNothing);
    });

    testWidgets('English error labels', (tester) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice',
        repository: _FailingRepository(),
        locale: const Locale('en'),
      );
      expect(find.text(_en.loadError), findsOneWidget);
      expect(find.text('Code: PLATFORM.INTERNAL.UNEXPECTED'), findsOneWidget);
      expect(find.text('Trace ID: trace-123'), findsOneWidget);
      expect(_enShared.errorCodeLabel, 'Code');
    });

    testWidgets('dialogs get the backoffice strings too', (tester) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/sagas/s-102',
        locale: const Locale('en'),
      );
      await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text(_en.reasonHelp), findsOneWidget);
    });
  });

  group('action errors use showActionError of ui', () {
    testWidgets('saga action failure shows a SnackBar in Spanish', (
      tester,
    ) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: _ActionFailingRepository(),
      );
      await _forceCompensation(tester, 'Motivo');

      final code = _ActionFailingRepository.code;
      expect(tester.takeException(), isNull);
      expect(find.byType(SnackBar), findsOneWidget);
      expect(
        find.text('${errorMessage(_shared, code)} ($code)'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('saga-reason-field')), findsNothing);
    });

    testWidgets('saga action failure in English', (tester) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: _ActionFailingRepository(),
        locale: const Locale('en'),
      );
      await _forceCompensation(tester, 'Reason');

      final code = _ActionFailingRepository.code;
      expect(
        find.text('${errorMessage(_enShared, code)} ($code)'),
        findsOneWidget,
      );
    });

    testWidgets('DLQ redrive failure shows a SnackBar and keeps messages', (
      tester,
    ) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/dlq/notifications-tasks-events',
        repository: _ActionFailingRepository(),
      );
      await tester.tap(find.byKey(const Key('dlq-redrive')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('dlq-redrive-confirm')));
      await tester.pumpAndSettle();

      final code = _ActionFailingRepository.code;
      expect(tester.takeException(), isNull);
      expect(
        find.text('${errorMessage(_shared, code)} ($code)'),
        findsOneWidget,
      );
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    });

    testWidgets('a contract violation in a saga action shows a SnackBar', (
      tester,
    ) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: _ClientFailingRepository(),
      );
      await _forceCompensation(tester, 'Motivo');

      expect(tester.takeException(), isNull);
      expect(
        find.text(
          errorMessage(_shared, PlatformErrorCode.validationInvalidInput.code),
        ),
        findsOneWidget,
      );
    });

    testWidgets('a network failure in redrive shows a SnackBar', (
      tester,
    ) async {
      await pumpBackoffice(
        tester,
        location: '/backoffice/dlq/notifications-tasks-events',
        repository: _ClientFailingRepository(),
      );
      await tester.tap(find.byKey(const Key('dlq-redrive')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('dlq-redrive-confirm')));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text(_shared.errorFallback), findsOneWidget);
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    });
  });

  group('screens', () {
    testWidgets('tenant search filters by name', (tester) async {
      await pumpBackoffice(tester, location: '/backoffice/tenants');

      expect(find.text('Panadería Luna'), findsOneWidget);
      expect(find.text('Acme Logística'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('tenant-search')), 'acme');
      await tester.pumpAndSettle();

      expect(find.text('Acme Logística'), findsOneWidget);
      expect(find.text('Panadería Luna'), findsNothing);
    });

    testWidgets('a tenant opens its nested detail route', (tester) async {
      final mounted = await pumpBackoffice(
        tester,
        location: '/backoffice/tenants',
      );
      await tester.tap(find.text('Clínica Norte'));
      await tester.pumpAndSettle();

      expect(locationOf(mounted.router).path, '/backoffice/tenants/t-003');
      expect(find.text(_es.tenantDetailTitle), findsOneWidget);
      expect(find.text('Factura vencida'), findsOneWidget);
    });

    testWidgets('saga list highlights sagas that need intervention', (
      tester,
    ) async {
      await pumpBackoffice(tester, location: '/backoffice/sagas');

      expect(
        find.byKey(const ValueKey('saga-highlight-s-102')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('saga-highlight-s-104')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('saga-highlight-s-101')), findsNothing);
      expect(find.byKey(const ValueKey('saga-s-101')), findsOneWidget);
    });

    testWidgets('manual saga action needs a reason before it is applied', (
      tester,
    ) async {
      final repository = FakeBackofficeRepository();
      await pumpBackoffice(
        tester,
        location: '/backoffice/sagas/s-102',
        repository: repository,
      );

      await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
      await tester.pumpAndSettle();

      final confirm = find.byKey(const Key('saga-reason-confirm'));
      expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

      await tester.enterText(find.byKey(const Key('saga-reason-field')), '  ');
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

      await tester.enterText(
        find.byKey(const Key('saga-reason-field')),
        'Cliente confirmó por correo',
      );
      await tester.pumpAndSettle();
      await tester.tap(confirm);
      await tester.pumpAndSettle();

      expect((await repository.saga('s-102'))?.status, SagaStatus.compensating);
      final audit = await repository.sagaAudit('s-102');
      expect(audit.first.action, 'saga.forceCompensation');
      expect(audit.first.detail, 'Cliente confirmó por correo');
      expect(find.text('Cliente confirmó por correo'), findsOneWidget);
      expect(find.text(_es.sagaActionDone), findsOneWidget);
    });

    testWidgets('a DLQ queue opens its route and redrive asks first', (
      tester,
    ) async {
      final repository = FakeBackofficeRepository();
      const queue = 'notifications-tasks-events';
      final mounted = await pumpBackoffice(
        tester,
        location: '/backoffice/dlq',
        repository: repository,
      );

      await tester.tap(find.byKey(const ValueKey('dlq-queue-$queue')));
      await tester.pumpAndSettle();
      expect(locationOf(mounted.router).path, '/backoffice/dlq/$queue');
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));

      // Cancelling keeps the messages.
      await tester.tap(find.byKey(const Key('dlq-redrive')));
      await tester.pumpAndSettle();
      expect(find.text(_es.dlqRedriveConfirm(3, queue)), findsOneWidget);
      await tester.tap(find.text(_shared.actionCancel));
      await tester.pumpAndSettle();
      expect(await repository.deadLetterMessages(queue), hasLength(3));

      // Confirming moves them.
      await tester.tap(find.byKey(const Key('dlq-redrive')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('dlq-redrive-confirm')));
      await tester.pumpAndSettle();

      expect(await repository.deadLetterMessages(queue), isEmpty);
      expect(find.text(_es.dlqRedriveDone(3)), findsOneWidget);
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNothing);
    });
  });
}
