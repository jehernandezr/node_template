import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/invoices_screen.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:utils/utils.dart' show formatMoney;
import 'package:contracts/contracts.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:material_ui/material_ui.dart';

import '../utils/billing_test_app.dart';

final _es = BillingTestApp.es;

/// Repository whose invoices never arrive, to keep a screen loading.
base class _PendingRepository extends FakeBillingRepository {
  final Completer<List<Invoice>> completer = Completer();

  @override
  Future<List<Invoice>> invoices() => completer.future;
}

String _cop(int amountMinor) => formatMoney(
  MoneyAmount(amountMinor: amountMinor, currency: Currency.cop.code),
  locale: 'es',
);

void main() {
  group(InvoicesScreen, () {
    testWidgets('invoice list shows number, total and status', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoicesScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();

      expect(find.text('FAC-2026-0010'), findsOneWidget);
      expect(find.text(_cop(201500)), findsOneWidget);
      expect(find.text('Emitida'), findsOneWidget);
      expect(find.text('Pagada'), findsOneWidget);
      expect(find.text('Fallida'), findsOneWidget);
    });

    testWidgets('invoice list shows the localized load error', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoicesScreen(
          repository: FakeBillingRepository(
            behavior: DemoBehavior()
              ..failNext(
                ApiErrorException(ProblemFixtures.unavailable()),
                count: 10,
              ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(_es.loadError), findsOneWidget);
    });

    testWidgets('meets the accessibility guidelines', (tester) async {
      await const BillingTestApp().pump(
        tester,
        InvoicesScreen(repository: FakeBillingRepository()),
      );
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('invoices: loading, then data', (tester) async {
      final repository = _PendingRepository();
      await const BillingTestApp().pump(
        tester,
        InvoicesScreen(repository: repository),
      );
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsWidgets);

      repository.completer.complete(await FakeBillingRepository().invoices());
      await tester.pumpAndSettle();
      expect(find.text('FAC-2026-0010'), findsOneWidget);
    });

    testWidgets('invoices: error, then retry loads the data', (tester) async {
      final repository = _PendingRepository();
      await const BillingTestApp().pump(
        tester,
        InvoicesScreen(repository: repository),
      );
      repository.completer.completeError(
        ApiErrorException(ProblemFixtures.unavailable()),
      );
      await tester.pumpAndSettle();
      expect(find.text(_es.loadError), findsOneWidget);
    });
  });
}
