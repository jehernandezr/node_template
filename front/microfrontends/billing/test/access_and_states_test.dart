import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/mf_billing.dart';
import 'package:mf_billing/src/data/billing_repository.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/screens/billing_plan_screen.dart';
import 'package:mf_billing/src/screens/billing_screens.dart';
import 'package:mf_billing/src/screens/invoices_screen.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';

import 'support/test_app.dart';

final _es = lookupBillingLocalizations(const Locale('es'));
final _en = lookupBillingLocalizations(const Locale('en'));

MicrofrontendScope _scope() =>
    MicrofrontendScope(DefaultShellServices(session: UserSession.anonymous()));

/// Repository whose invoices never arrive, to keep a screen loading.
base class _PendingRepository extends FakeBillingRepository {
  final Completer<List<Invoice>> completer = Completer();

  @override
  Future<List<Invoice>> invoices() => completer.future;
}

base class _DisposableRepository extends FakeBillingRepository {
  bool disposed = false;

  @override
  void dispose() => disposed = true;
}

ApiErrorException _error() => ApiErrorException(
  const ProblemDetails(
    type: 'about:blank',
    title: 'Internal',
    status: 500,
    code: 'PLATFORM.INTERNAL.UNEXPECTED',
  ),
);

void main() {
  group('access', () {
    testWidgets('with the billing permission the change plan action shows', (
      tester,
    ) async {
      await tester.pumpWidget(
        testApp(BillingPlanScreen(repository: FakeBillingRepository())),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsOneWidget);
    });

    testWidgets('without the billing permission the action is absent', (
      tester,
    ) async {
      await tester.pumpWidget(
        testApp(
          BillingPlanScreen(repository: FakeBillingRepository()),
          session: noBillingSession(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsNothing);
      // The read-only content still renders.
      expect(find.text('Pro'), findsOneWidget);
    });

    testWidgets('the action disappears when the session loses the permission', (
      tester,
    ) async {
      final session = ValueNotifier<UserSession>(billingSession());
      await tester.pumpWidget(
        ShellAccessScope(
          session: session,
          child: MaterialApp(
            locale: const Locale('es'),
            localizationsDelegates: [
              ...GlobalMaterialLocalizations.delegates,
              AppLocalizations.delegate,
              BillingLocalizations.delegate,
            ],
            supportedLocales: const [Locale('es'), Locale('en')],
            home: BillingPlanScreen(repository: FakeBillingRepository()),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsOneWidget);

      session.value = noBillingSession();
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsNothing);
    });
  });

  group('states', () {
    testWidgets('invoices: loading, then data', (tester) async {
      final repository = _PendingRepository();
      await tester.pumpWidget(testApp(InvoicesScreen(repository: repository)));
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsWidgets);

      repository.completer.complete(await FakeBillingRepository().invoices());
      await tester.pumpAndSettle();
      expect(find.text('FAC-2026-0010'), findsOneWidget);
    });

    testWidgets('invoices: error, then retry loads the data', (tester) async {
      final repository = _PendingRepository();
      await tester.pumpWidget(testApp(InvoicesScreen(repository: repository)));
      repository.completer.completeError(_error());
      await tester.pumpAndSettle();
      expect(find.text(_es.loadError), findsOneWidget);
    });

    testWidgets('plan screen uses a single app bar', (tester) async {
      await tester.pumpWidget(
        testApp(BillingPlanScreen(repository: FakeBillingRepository())),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('changing the plan reloads the screen', (tester) async {
      final repository = FakeBillingRepository();
      await tester.pumpWidget(
        testApp(BillingPlanScreen(repository: repository)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text(_es.changePlan));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Empresa'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.confirmChange));
      await tester.pumpAndSettle();

      expect(find.text('Empresa'), findsOneWidget);
      expect((await repository.currentSubscription()).plan.id, 'empresa');
    });

    testWidgets('a failed plan change shows the action error', (tester) async {
      await tester.pumpWidget(
        testApp(BillingPlanScreen(repository: _FailingChangeRepository())),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.changePlan));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Empresa'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.confirmChange));
      await tester.pumpAndSettle();

      expect(find.textContaining(_es.changePlanError), findsOneWidget);
    });
  });

  group('l10n', () {
    testWidgets('screens speak English under the en locale', (tester) async {
      await tester.pumpWidget(
        testApp(
          BillingPlanScreen(repository: FakeBillingRepository()),
          locale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(_en.billingPageTitle), findsOneWidget);
      expect(find.text(_en.changePlan), findsOneWidget);
      expect(find.text(_es.changePlan), findsNothing);
    });
  });

  group('scope', () {
    test('a new scope does not see another scope\'s data', () async {
      final a = _scope();
      final b = _scope();
      await billingRepositoryOf(a).changePlan('inicio');
      expect(
        (await billingRepositoryOf(b).currentSubscription()).plan.id,
        'pro',
      );
    });

    test('the repository is a ScopedResource closed by its scope', () async {
      final scope = _scope();
      final repository = _DisposableRepository();
      scope.get<BillingRepository>((_) => repository);
      expect(repository, isA<ScopedResource>());

      await scope.dispose();
      expect(repository.disposed, isTrue);
    });
  });

  group('routes', () {
    setUp(resetDeferredPageCache);

    Future<void> mount(
      WidgetTester tester,
      UserSession session,
      String initial,
    ) async {
      final scope = _scope();
      final router = GoRouter(
        initialLocation: initial,
        routes: [
          ...billingManifest.buildRoutes(deferredPage, () => scope),
          GoRoute(
            path: '/forbidden',
            builder: (_, _) => const Text('forbidden-page'),
          ),
          GoRoute(path: '/login', builder: (_, _) => const Text('login-page')),
        ],
      );
      await tester.pumpWidget(
        ShellAccessScope(
          session: ValueNotifier<UserSession>(session),
          child: MaterialApp.router(
            routerConfig: router,
            locale: const Locale('es'),
            localizationsDelegates: [
              ...GlobalMaterialLocalizations.delegates,
              AppLocalizations.delegate,
            ],
            supportedLocales: const [Locale('es'), Locale('en')],
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('/billing/invoices renders through the deferred library', (
      tester,
    ) async {
      await mount(tester, billingSession(), '/billing/invoices');
      expect(find.text(_es.invoicesTitle), findsOneWidget);
      expect(find.text('FAC-2026-0010'), findsOneWidget);
    });

    testWidgets('the invoice id comes from params', (tester) async {
      await mount(tester, billingSession(), '/billing/invoices/inv_002');
      expect(find.text('FAC-2026-0008'), findsOneWidget);
    });

    testWidgets('a session without the permission is redirected', (
      tester,
    ) async {
      await mount(tester, noBillingSession(), '/billing/invoices');
      expect(find.text('forbidden-page'), findsOneWidget);
    });
  });
}

base class _FailingChangeRepository extends FakeBillingRepository {
  @override
  Future<Subscription> changePlan(String planId) async => throw _error();
}
