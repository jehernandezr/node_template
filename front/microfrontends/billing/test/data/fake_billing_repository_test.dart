import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(FakeBillingRepository, () {
    test('a programmed failure hits only its operation', () async {
      final behavior = DemoBehavior()
        ..failNext(const FakeFailure(), operation: BillingOperation.invoices);
      final repository = FakeBillingRepository(behavior: behavior);
      addTearDown(repository.dispose);

      await expectLater(repository.invoices(), throwsA(isA<FakeFailure>()));
      expect(await repository.currentSubscription(), isNotNull);
    });

    test('calls after dispose throw DemoDisposedException', () async {
      final repository = FakeBillingRepository();
      repository.dispose();

      await expectLater(
        repository.invoices(),
        throwsA(isA<DemoDisposedException>()),
      );
    });

    test('a changed plan is the one the subscription returns', () async {
      final repository = FakeBillingRepository();
      addTearDown(repository.dispose);
      expect((await repository.currentSubscription()).plan.id, 'pro');

      await repository.changePlan('empresa');

      expect((await repository.currentSubscription()).plan.id, 'empresa');
    });

    test('an unknown plan throws ApiErrorException', () async {
      final repository = FakeBillingRepository();
      addTearDown(repository.dispose);

      await expectLater(
        repository.changePlan('nope'),
        throwsA(isA<ApiErrorException>()),
      );
    });
  });
}
