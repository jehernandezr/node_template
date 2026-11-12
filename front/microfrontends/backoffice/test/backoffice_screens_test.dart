import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/backoffice_models.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/dlq_screen.dart';
import 'package:mf_backoffice/src/screens/overview_screen.dart';
import 'package:mf_backoffice/src/screens/saga_detail_screen.dart';
import 'package:mf_backoffice/src/screens/sagas_screen.dart';
import 'package:mf_backoffice/src/screens/tenants_screen.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _shared = lookupAppLocalizations(const Locale('es'));
final _enShared = lookupAppLocalizations(const Locale('en'));

/// Pumps [router] with the backoffice and shell localizations of [locale].
Future<void> _pump(
  WidgetTester tester,
  GoRouter router, {
  Locale locale = const Locale('es'),
}) async {
  tester.view.physicalSize = const Size(1280, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp.router(
      routerConfig: router,
      locale: locale,
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: const [
        BackofficeLocalizations.delegate,
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
    ),
  );
  await tester.pumpAndSettle();
}

/// A router with one route, so `context.go` works inside the screen under test.
GoRouter _single(Widget screen, {String path = '/'}) => GoRouter(
  initialLocation: path,
  routes: [GoRoute(path: path, builder: (context, state) => screen)],
);

/// A repository whose every read fails with an API problem.
class _FailingRepository extends FakeBackofficeRepository {
  @override
  Future<BackofficeOverview> overview() => Future.error(
    ApiErrorException(
      const ProblemDetails(
        type: 'about:blank',
        title: 'Internal',
        status: 500,
        code: 'PLATFORM.INTERNAL.UNEXPECTED',
        traceId: 'trace-123',
      ),
    ),
  );
}

/// A repository whose manual actions and redrive fail with an API problem.
class _ActionFailingRepository extends FakeBackofficeRepository {
  static const code = 'PLATFORM.CONFLICT.VERSION_MISMATCH';

  static ApiErrorException _conflict() => ApiErrorException(
    const ProblemDetails(
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

void main() {
  testWidgets('overview shows tenants, sagas needing intervention and DLQ messages', (
    tester,
  ) async {
    await _pump(tester, _single(OverviewScreen(repository: FakeBackofficeRepository())));

    expect(tester.widget<Text>(find.byKey(const Key('overview-tenants'))).data, '5');
    // s-102 (RequiresIntervention) and s-104 (CompensationFailed).
    expect(tester.widget<Text>(find.byKey(const Key('overview-sagas'))).data, '2');
    // 3 notifications + 0 reports + 12 billing.
    expect(tester.widget<Text>(find.byKey(const Key('overview-dlq'))).data, '15');
    expect(find.text(_es.overviewTitle), findsWidgets);
    expect(find.text(_es.cardSagas), findsOneWidget);
  });

  testWidgets('a failed load shows the API code and trace id through ErrorView', (
    tester,
  ) async {
    await _pump(tester, _single(OverviewScreen(repository: _FailingRepository())));

    expect(find.text(_es.loadError), findsOneWidget);
    expect(find.text('Código: PLATFORM.INTERNAL.UNEXPECTED'), findsOneWidget);
    expect(find.text('ID de traza: trace-123'), findsOneWidget);
  });

  testWidgets('the error view uses English labels in English', (tester) async {
    final en = lookupBackofficeLocalizations(const Locale('en'));
    await _pump(
      tester,
      _single(OverviewScreen(repository: _FailingRepository())),
      locale: const Locale('en'),
    );

    expect(find.text(en.loadError), findsOneWidget);
    expect(find.text('Code: PLATFORM.INTERNAL.UNEXPECTED'), findsOneWidget);
    expect(find.text('Trace ID: trace-123'), findsOneWidget);
    expect(find.text('Código: PLATFORM.INTERNAL.UNEXPECTED'), findsNothing);
    expect(_enShared.errorCodeLabel, 'Code');
  });

  testWidgets('a saga manual action that throws an API error shows a SnackBar', (
    tester,
  ) async {
    await _pump(
      tester,
      _single(
        SagaDetailScreen(sagaId: 's-102', repository: _ActionFailingRepository()),
        path: '/s',
      ),
    );

    await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('saga-reason-field')), 'Motivo');
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('saga-reason-confirm')));
    await tester.pumpAndSettle();

    final code = _ActionFailingRepository.code;
    expect(tester.takeException(), isNull);
    expect(find.byType(SnackBar), findsOneWidget);
    expect(
      find.text('${errorMessage(_shared, code)} (${_shared.errorCodeLabel}: $code)'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('saga-reason-field')), findsNothing);
  });

  testWidgets('a DLQ redrive that throws an API error shows a SnackBar and keeps messages', (
    tester,
  ) async {
    const queue = 'notifications-tasks-events';
    await _pump(
      tester,
      GoRouter(
        initialLocation: '/backoffice/dlq/$queue',
        routes: [
          GoRoute(
            path: '/backoffice/dlq/:queue',
            builder: (context, state) => DlqScreen(
              repository: _ActionFailingRepository(),
              queue: state.pathParameters['queue'],
            ),
          ),
        ],
      ),
    );

    await tester.tap(find.byKey(const Key('dlq-redrive')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dlq-redrive-confirm')));
    await tester.pumpAndSettle();

    final code = _ActionFailingRepository.code;
    expect(tester.takeException(), isNull);
    expect(find.byType(SnackBar), findsOneWidget);
    expect(
      find.text('${errorMessage(_shared, code)} (${_shared.errorCodeLabel}: $code)'),
      findsOneWidget,
    );
    expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
  });

  testWidgets('a saga manual action failure with English locale is shown in English', (
    tester,
  ) async {
    await _pump(
      tester,
      _single(
        SagaDetailScreen(sagaId: 's-102', repository: _ActionFailingRepository()),
        path: '/s',
      ),
      locale: const Locale('en'),
    );

    await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('saga-reason-field')), 'Reason');
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('saga-reason-confirm')));
    await tester.pumpAndSettle();

    final code = _ActionFailingRepository.code;
    final en = lookupAppLocalizations(const Locale('en'));
    expect(
      find.text('${errorMessage(en, code)} (${en.errorCodeLabel}: $code)'),
      findsOneWidget,
    );
  });

  testWidgets('tenant search filters by name', (tester) async {
    await _pump(tester, _single(TenantsScreen(repository: FakeBackofficeRepository())));

    expect(find.text('Panadería Luna'), findsOneWidget);
    expect(find.text('Acme Logística'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('tenant-search')), 'acme');
    await tester.pumpAndSettle();

    expect(find.text('Acme Logística'), findsOneWidget);
    expect(find.text('Panadería Luna'), findsNothing);
  });

  testWidgets('saga list highlights sagas that need intervention', (tester) async {
    await _pump(tester, _single(SagasScreen(repository: FakeBackofficeRepository())));

    expect(find.byKey(const ValueKey('saga-highlight-s-102')), findsOneWidget);
    expect(find.byKey(const ValueKey('saga-highlight-s-104')), findsOneWidget);
    expect(find.byKey(const ValueKey('saga-highlight-s-101')), findsNothing);
    expect(find.byKey(const ValueKey('saga-s-101')), findsOneWidget);
  });

  testWidgets('manual saga action needs a reason before it is applied', (tester) async {
    final repository = FakeBackofficeRepository();
    await _pump(
      tester,
      _single(SagaDetailScreen(sagaId: 's-102', repository: repository), path: '/s'),
    );

    await tester.tap(find.byKey(const Key('saga-action-forceCompensation')));
    await tester.pumpAndSettle();

    final confirm = find.byKey(const Key('saga-reason-confirm'));
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.enterText(find.byKey(const Key('saga-reason-field')), '   ');
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.enterText(
      find.byKey(const Key('saga-reason-field')),
      'Cliente confirmó por correo',
    );
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

    await tester.tap(confirm);
    await tester.pumpAndSettle();

    final saga = await repository.saga('s-102');
    expect(saga?.status, SagaStatus.compensating);
    final audit = await repository.sagaAudit('s-102');
    expect(audit.first.action, 'saga.forceCompensation');
    expect(audit.first.detail, 'Cliente confirmó por correo');
    expect(find.text('Cliente confirmó por correo'), findsOneWidget);
  });

  testWidgets('DLQ queue opens its route and redrive asks for confirmation', (tester) async {
    final repository = FakeBackofficeRepository();
    const queue = 'notifications-tasks-events';
    await _pump(
      tester,
      GoRouter(
        initialLocation: '/backoffice/dlq',
        routes: [
          GoRoute(
            path: '/backoffice/dlq',
            builder: (context, state) => DlqScreen(repository: repository),
          ),
          GoRoute(
            path: '/backoffice/dlq/:queue',
            builder: (context, state) => DlqScreen(
              repository: repository,
              queue: state.pathParameters['queue'],
            ),
          ),
        ],
      ),
    );

    await tester.tap(find.byKey(const ValueKey('dlq-queue-$queue')));
    await tester.pumpAndSettle();
    expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));

    // Cancelling keeps the messages.
    await tester.tap(find.byKey(const Key('dlq-redrive')));
    await tester.pumpAndSettle();
    expect(_es.dlqRedriveConfirm(3, queue), isNotEmpty);
    expect(find.text(_es.dlqRedriveConfirm(3, queue)), findsOneWidget);
    await tester.tap(find.text(_shared.actionCancel));
    await tester.pumpAndSettle();
    expect((await repository.deadLetterMessages(queue)).length, 3);

    // Confirming moves them.
    await tester.tap(find.byKey(const Key('dlq-redrive')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dlq-redrive-confirm')));
    await tester.pumpAndSettle();

    expect(await repository.deadLetterMessages(queue), isEmpty);
    expect(find.text(_es.dlqRedriveDone(3)), findsOneWidget);
    expect(find.textContaining('SMTP timeout tras 30 s'), findsNothing);
  });
}
