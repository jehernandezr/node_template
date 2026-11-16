import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/invoice_detail_controller.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

void main() {
  group(InvoiceDetailController, () {
    test('start loads the invoice with the id', () async {
      final controller = InvoiceDetailController(
        FakeBillingRepository(),
        invoiceId: 'inv_002',
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.invoice.valueOrNull?.id, 'inv_002');
    });

    test('an unknown id is loaded as null data', () async {
      final controller = InvoiceDetailController(
        FakeBillingRepository(),
        invoiceId: 'nope',
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.invoice, isA<AsyncData<Invoice?>>());
      expect(controller.invoice.valueOrNull, isNull);
    });

    test('a failure is an error state', () async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(const FakeFailure(), operation: BillingOperation.invoice),
      );
      final controller = InvoiceDetailController(
        repository,
        invoiceId: 'inv_002',
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.invoice, isA<AsyncError<Invoice?>>());
    });
  });
}
