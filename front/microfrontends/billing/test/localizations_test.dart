import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/screens/invoices_screen.dart';

import 'support/test_app.dart';

void main() {
  test('Spanish is the template and English is available', () {
    final es = lookupBillingLocalizations(const Locale('es'));
    final en = lookupBillingLocalizations(const Locale('en'));

    expect(es.billingPageTitle, 'Facturación');
    expect(en.billingPageTitle, 'Billing');
    expect(
      es.periodRange('1 oct 2026', '31 oct 2026'),
      '1 oct 2026 a 31 oct 2026',
    );
  });

  testWidgets('screen copy and dates come from BillingLocalizations (es)', (
    tester,
  ) async {
    await tester.pumpWidget(
      testApp(InvoicesScreen(repository: FakeBillingRepository())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Facturas'), findsOneWidget);
    expect(find.text('1 oct 2026 a 31 oct 2026'), findsOneWidget);
    expect(find.text('Emitida'), findsOneWidget);
  });
}
