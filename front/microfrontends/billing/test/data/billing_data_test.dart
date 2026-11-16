import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/billing_data.dart';
import 'package:mf_billing/src/data/billing_repository.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:shell_core/shell_core.dart';

MicrofrontendScope _scope() => MicrofrontendScope(
  ShellServices(mode: ShellMode.demo, session: UserSession.anonymous()),
);

void main() {
  group(BillingData, () {
    test('one repository per scope', () {
      final scope = _scope();
      expect(
        identical(
          scope.repository(BillingData.repository),
          scope.repository(BillingData.repository),
        ),
        isTrue,
      );
    });

    test('a plan change in one scope is not visible in another', () async {
      final scopeA = _scope();
      final scopeB = _scope();
      final repoA = scopeA.repository(BillingData.repository);
      final repoB = scopeB.repository(BillingData.repository);

      await repoA.changePlan('empresa');

      expect((await repoA.currentSubscription()).plan.id, 'empresa');
      expect((await repoB.currentSubscription()).plan.id, 'pro');
    });

    test('disposing a scope does not affect the other identity', () async {
      final scopeA = _scope();
      final scopeB = _scope();
      await scopeA.repository(BillingData.repository).changePlan('inicio');

      await scopeA.dispose();

      expect(
        (await scopeB.repository(BillingData.repository).currentSubscription())
            .plan
            .id,
        'pro',
      );
    });

    test('a new scope does not see another scope\'s data', () async {
      final a = _scope();
      final b = _scope();
      await a.repository(BillingData.repository).changePlan('inicio');
      expect(
        (await b.repository(BillingData.repository).currentSubscription())
            .plan
            .id,
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
}

base class _DisposableRepository extends FakeBillingRepository {
  bool disposed = false;

  @override
  void dispose() => disposed = true;
}
