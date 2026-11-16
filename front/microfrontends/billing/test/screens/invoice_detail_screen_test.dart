import 'package:contracts/contracts.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/invoice_detail_screen.dart';
import 'package:mf_billing/src/screens/invoices_screen.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../utils/billing_test_app.dart';

final _es = BillingTestApp.es;
final _en = BillingTestApp.en;

String _cop(int amountMinor) => formatMoney(
  MoneyAmount(amountMinor: amountMinor, currency: Currency.cop.code),
  locale: 'es',
);

void main() {
  group(InvoiceDetailScreen, () {
    testWidgets('invoice detail lists fixed and usage lines', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoiceDetailScreen(
          repository: FakeBillingRepository(),
          invoiceId: 'inv_002',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('FAC-2026-0008'), findsOneWidget);
      expect(find.text(_es.fixedFee), findsOneWidget);
      expect(find.text(_es.usageCharge), findsOneWidget);
      expect(find.text(_cop(24000)), findsOneWidget);
      expect(find.text(_cop(213000)), findsOneWidget);
      expect(find.text(_es.download), findsOneWidget);
    });

    testWidgets('unknown invoice shows not found', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoiceDetailScreen(
          repository: FakeBillingRepository(),
          invoiceId: 'missing',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(_es.invoiceNotFound), findsOneWidget);
    });

    testWidgets('meets the accessibility guidelines', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoiceDetailScreen(
          repository: FakeBillingRepository(),
          invoiceId: 'inv_002',
        ),
      );
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('error view labels follow the en locale', (tester) async {
      await const BillingTestApp(locale: Locale('en')).pump(
        tester,
        InvoicesScreen(
          repository: FakeBillingRepository(
            behavior: DemoBehavior()
              ..failNext(
                ApiErrorException(
                  ProblemFixtures.unavailable(traceId: 'trace-1'),
                ),
                count: 10,
              ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(_en.loadError), findsOneWidget);
      expect(
        find.textContaining('Code: PLATFORM.INTERNAL.UNEXPECTED'),
        findsOneWidget,
      );
      expect(find.textContaining('Trace ID: trace-1'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
