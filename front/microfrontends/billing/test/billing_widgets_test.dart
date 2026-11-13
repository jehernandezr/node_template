import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/data/billing_models.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/screens/billing_plan_screen.dart';
import 'package:mf_billing/src/screens/invoice_detail_screen.dart';
import 'package:mf_billing/src/screens/invoices_screen.dart';
import 'package:mf_billing/src/widgets/billing_colors.dart';
import 'package:mf_billing/src/widgets/usage_meter.dart';
import 'package:contracts/contracts.dart';

import 'support/test_app.dart';

final _es = lookupBillingLocalizations(const Locale('es'));

Quota _quota(int limit) => Quota(key: 'k', label: 'Cuota', limit: limit);

Color _meterColor(WidgetTester tester) {
  final indicator = tester.widget<LinearProgressIndicator>(
    find.byType(LinearProgressIndicator),
  );
  return indicator.color!;
}

ColorScheme _scheme(WidgetTester tester) =>
    Theme.of(tester.element(find.byType(UsageMeter))).colorScheme;

ApiErrorException _serverError() => ApiErrorException(
  const ProblemDetails(
    type: 'about:blank',
    title: 'Internal',
    status: 500,
    code: 'PLATFORM.INTERNAL.UNEXPECTED',
    traceId: 'trace-1',
  ),
);

void main() {
  testWidgets('plan screen shows plan, status and usage', (tester) async {
    await tester.pumpWidget(
      testApp(BillingPlanScreen(repository: FakeBillingRepository())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Pro'), findsOneWidget);
    expect(find.text('\$ 189.000 / Mensual'), findsOneWidget);
    expect(find.text('Activa'), findsOneWidget);
    expect(find.text('Usuarios'), findsOneWidget);
    expect(find.text('20 / 25'), findsOneWidget);
    expect(find.text('Llamadas API'), findsOneWidget);
    expect(find.text('4.200 / 100.000'), findsOneWidget);
    expect(find.text(_es.changePlan), findsOneWidget);
    expect(find.text(_es.billingPageTitle), findsOneWidget);
  });

  testWidgets('plan screen shows the localized load error', (tester) async {
    await tester.pumpWidget(
      testApp(
        BillingPlanScreen(
          repository: FakeBillingRepository(failure: _serverError()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(_es.loadError), findsOneWidget);
    expect(find.textContaining('PLATFORM.INTERNAL.UNEXPECTED'), findsOneWidget);
    expect(find.textContaining('trace-1'), findsOneWidget);
  });

  testWidgets('usage meters switch color at 80% and 100%', (tester) async {
    Future<Color> colorAt(int used, int limit) async {
      await tester.pumpWidget(
        testApp(
          UsageMeter(
            usage: QuotaUsage(quota: _quota(limit), used: used),
          ),
        ),
      );
      return _meterColor(tester);
    }

    expect(await colorAt(79, 100), _scheme(tester).primary);
    expect(await colorAt(80, 100), billingWarningColor);
    expect(await colorAt(99, 100), billingWarningColor);
    expect(await colorAt(100, 100), _scheme(tester).error);
  });

  testWidgets('meter bar is capped at full when over the limit', (
    tester,
  ) async {
    await tester.pumpWidget(
      testApp(UsageMeter(usage: QuotaUsage(quota: _quota(10), used: 25))),
    );
    final indicator = tester.widget<LinearProgressIndicator>(
      find.byType(LinearProgressIndicator),
    );
    expect(indicator.value, 1.0);
    expect(find.text('25 / 10'), findsOneWidget);
  });

  testWidgets('invoice list shows number, total and status', (tester) async {
    await tester.pumpWidget(
      testApp(InvoicesScreen(repository: FakeBillingRepository())),
    );
    await tester.pumpAndSettle();

    expect(find.text('FAC-2026-0010'), findsOneWidget);
    expect(find.text('\$ 201.500'), findsOneWidget);
    expect(find.text('Emitida'), findsOneWidget);
    expect(find.text('Pagada'), findsOneWidget);
    expect(find.text('Fallida'), findsOneWidget);
  });

  testWidgets('invoice list shows the localized load error', (tester) async {
    await tester.pumpWidget(
      testApp(
        InvoicesScreen(
          repository: FakeBillingRepository(failure: _serverError()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(_es.loadError), findsOneWidget);
  });

  testWidgets('invoice detail lists fixed and usage lines', (tester) async {
    await tester.pumpWidget(
      testApp(
        InvoiceDetailScreen(
          repository: FakeBillingRepository(),
          invoiceId: 'inv_002',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('FAC-2026-0008'), findsOneWidget);
    expect(find.text(_es.fixedFee), findsOneWidget);
    expect(find.text(_es.usageCharge), findsOneWidget);
    expect(find.text('\$ 24.000'), findsOneWidget);
    expect(find.text('\$ 213.000'), findsOneWidget);
    expect(find.text(_es.download), findsOneWidget);
  });

  testWidgets('unknown invoice shows not found', (tester) async {
    await tester.pumpWidget(
      testApp(
        InvoiceDetailScreen(
          repository: FakeBillingRepository(),
          invoiceId: 'missing',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(_es.invoiceNotFound), findsOneWidget);
  });
  testWidgets('error view labels follow the en locale', (tester) async {
    final en = lookupBillingLocalizations(const Locale('en'));
    await tester.pumpWidget(
      testApp(
        InvoicesScreen(
          repository: FakeBillingRepository(failure: _serverError()),
        ),
        locale: const Locale('en'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(en.loadError), findsOneWidget);
    expect(
      find.textContaining('Code: PLATFORM.INTERNAL.UNEXPECTED'),
      findsOneWidget,
    );
    expect(find.textContaining('Trace ID: trace-1'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
