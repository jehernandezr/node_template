import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:mf_billing/src/screens/widgets/change_plan_sheet.dart';

import 'support/test_app.dart';

final _es = lookupBillingLocalizations(const Locale('es'));

/// Change of plan that fails before reaching the API, as a network error does.
base class _OfflineRepository extends FakeBillingRepository {
  @override
  Future<Subscription> changePlan(String planId) async =>
      throw const _OfflineException();
}

final class _OfflineException implements Exception {
  const _OfflineException();
}

void main() {
  testWidgets('select a plan, see the proration note and confirm', (
    tester,
  ) async {
    final repository = FakeBillingRepository();
    bool? result;

    await tester.pumpWidget(
      testApp(
        Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () async {
                  result = await showModalBottomSheet<bool>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ChangePlanSheet(
                      repository: repository,
                      currentPlanId: 'pro',
                    ),
                  );
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text(_es.changePlanTitle), findsOneWidget);
    expect(find.text(_es.currentPlanBadge), findsOneWidget);
    expect(find.text(_es.prorationNote), findsNothing);

    // The current plan cannot be selected.
    await tester.tap(find.text('Pro'));
    await tester.pumpAndSettle();
    expect(find.text(_es.prorationNote), findsNothing);

    await tester.tap(find.text('Empresa'));
    await tester.pumpAndSettle();
    expect(find.text(_es.prorationNote), findsOneWidget);

    await tester.tap(find.text(_es.confirmChange));
    await tester.pumpAndSettle();

    expect(result, isTrue);
    expect(find.text(_es.changePlanTitle), findsNothing);
    final current = await repository.currentSubscription();
    expect(current.plan.id, 'empresa');
  });

  testWidgets('cancel closes the sheet without changing the plan', (
    tester,
  ) async {
    final repository = FakeBillingRepository();
    bool? result;

    await tester.pumpWidget(
      testApp(
        Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => ChangePlanSheet(
                    repository: repository,
                    currentPlanId: 'pro',
                  ),
                );
              },
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Inicio'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(result, isNull);
    expect((await repository.currentSubscription()).plan.id, 'pro');
  });

  testWidgets('a network failure keeps the sheet open and usable', (
    tester,
  ) async {
    final repository = _OfflineRepository();

    await tester.pumpWidget(
      testApp(
        Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showModalBottomSheet<bool>(
                context: context,
                isScrollControlled: true,
                builder: (_) => ChangePlanSheet(
                  repository: repository,
                  currentPlanId: 'pro',
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Empresa'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(_es.confirmChange));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text(_es.changePlanTitle), findsOneWidget);
    expect(find.text(_es.changePlanError), findsOneWidget);
    // The confirm button is enabled again.
    await tester.tap(find.text(_es.confirmChange));
    await tester.pumpAndSettle();
    expect(find.text(_es.changePlanTitle), findsOneWidget);
  });
}
