import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/screens/billing_screens.dart';
import 'package:shell_core/shell_core.dart';

MicrofrontendScope _scope() =>
    MicrofrontendScope(DefaultShellServices(session: UserSession.anonymous()));

void main() {
  test('one repository per scope', () {
    final scope = _scope();
    expect(
      identical(billingRepositoryOf(scope), billingRepositoryOf(scope)),
      isTrue,
    );
  });

  test('a plan change in one scope is not visible in another', () async {
    final scopeA = _scope();
    final scopeB = _scope();
    final repoA = billingRepositoryOf(scopeA);
    final repoB = billingRepositoryOf(scopeB);

    await repoA.changePlan('empresa');

    expect((await repoA.currentSubscription()).plan.id, 'empresa');
    expect((await repoB.currentSubscription()).plan.id, 'pro');
  });

  test('disposing a scope does not affect the other identity', () async {
    final scopeA = _scope();
    final scopeB = _scope();
    await billingRepositoryOf(scopeA).changePlan('inicio');

    await scopeA.dispose();

    expect(
      (await billingRepositoryOf(scopeB).currentSubscription()).plan.id,
      'pro',
    );
  });
}
