import 'package:contracts/contracts.dart' hide BillingOperation;
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/screens/billing_plan_screen.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../utils/billing_sessions.dart';
import '../utils/billing_test_app.dart';

final _es = BillingTestApp.es;
final _en = BillingTestApp.en;

ApiErrorException _serverError() =>
    ApiErrorException(ProblemFixtures.unavailable(traceId: 'trace-1'));

void main() {
  group(BillingPlanScreen, () {
    testWidgets('plan screen shows plan, status and usage', (tester) async {
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Pro'), findsOneWidget);
      expect(find.text('${_cop(189000)} / Mensual'), findsOneWidget);
      expect(find.text('Activa'), findsOneWidget);
      expect(find.text('Usuarios'), findsOneWidget);
      expect(find.text('20 / 25'), findsOneWidget);
      expect(find.text('Llamadas API'), findsOneWidget);
      expect(find.text('4.200 / 100.000'), findsOneWidget);
      expect(find.text(_es.changePlan), findsOneWidget);
      expect(find.text(_es.billingPageTitle), findsOneWidget);
    });

    testWidgets('plan screen shows the localized load error', (tester) async {
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(
          repository: FakeBillingRepository(
            behavior: DemoBehavior()..failNext(_serverError(), count: 10),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(_es.loadError), findsOneWidget);
      expect(
        find.textContaining('PLATFORM.INTERNAL.UNEXPECTED'),
        findsOneWidget,
      );
      expect(find.textContaining('trace-1'), findsOneWidget);
    });

    testWidgets('plan screen uses a single app bar', (tester) async {
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('meets the accessibility guidelines', (tester) async {
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('with the billing permission the change plan action shows', (
      tester,
    ) async {
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsOneWidget);
    });

    testWidgets('without the billing permission the action is absent', (
      tester,
    ) async {
      await BillingTestApp(session: BillingSessions.none())
          .pump(tester, BillingPlanScreen(repository: FakeBillingRepository()));
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsNothing);
      expect(find.text('Pro'), findsOneWidget);
    });

    testWidgets('reading billing alone does not show the change plan action', (
      tester,
    ) async {
      await BillingTestApp(session: BillingSessions.reader())
          .pump(tester, BillingPlanScreen(repository: FakeBillingRepository()));
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsNothing);
      expect(find.text(_es.viewInvoices), findsOneWidget);
    });

    testWidgets('the action disappears when the session loses the permission', (
      tester,
    ) async {
      final session = ValueNotifier<UserSession>(BillingSessions.writer());
      await tester.pumpWidget(
        ShellAccessScope(
          session: session,
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('es'),
            supportedLocales: supportedLocales,
            localizationsDelegates: [
              AppLocalizations.delegate,
              ...GlobalMaterialLocalizations.delegates,
            ],
            home: DeferredLocalizations(
              delegates: const [BillingLocalizations.delegate],
              child: BillingPlanScreen(repository: FakeBillingRepository()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsOneWidget);

      session.value = BillingSessions.none();
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlan), findsNothing);
    });

    testWidgets('changing the plan reloads the screen', (tester) async {
      final repository = FakeBillingRepository();
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(repository: repository),
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
      await const BillingTestApp().pump(
        tester,
        BillingPlanScreen(
          repository: FakeBillingRepository(
            behavior: DemoBehavior()
              ..failNext(
                _serverError(),
                count: 2,
                operation: BillingOperation.changePlan,
              ),
          ),
        ),
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

    testWidgets('screens speak English under the en locale', (tester) async {
      await const BillingTestApp(locale: Locale('en'))
          .pump(tester, BillingPlanScreen(repository: FakeBillingRepository()));
      await tester.pumpAndSettle();
      expect(find.text(_en.billingPageTitle), findsOneWidget);
      expect(find.text(_en.changePlan), findsOneWidget);
      expect(find.text(_es.changePlan), findsNothing);
    });
  });
}

String _cop(int amountMinor) => formatMoney(
  MoneyAmount(amountMinor: amountMinor, currency: Currency.cop.wireCode),
  locale: 'es',
);
