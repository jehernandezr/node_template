import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/invoices_controller.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

void main() {
  group(InvoicesController, () {
    test('start loads the invoices, newest first', () async {
      final controller = InvoicesController(FakeBillingRepository());
      addTearDown(controller.dispose);

      await controller.start();

      final invoices = controller.invoices.valueOrNull!;
      expect(invoices, hasLength(5));
      expect(invoices.first.id, 'inv_005');
    });

    test('a failure is an error state and a retry loads', () async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(const FakeFailure(), operation: BillingOperation.invoices),
      );
      final controller = InvoicesController(repository);
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.invoices, isA<AsyncError<List<InvoiceSummary>>>());

      await controller.start();
      expect(controller.invoices.valueOrNull, hasLength(5));
    });
  });
}
