import 'package:contracts/contracts.dart'
    show ApiErrorException, BillingErrorCode;
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/data/billing_repository.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/widgets/change_plan_sheet.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../../utils/billing_test_app.dart';

final _es = BillingTestApp.es;
final _shared = lookupAppLocalizations(const Locale('es'));

/// A screen with a button that opens the sheet the way the screen does, and
/// reports what the sheet popped with.
Widget _host(BillingRepository repository, {void Function(bool?)? onResult}) =>
    Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: TextButton(
            onPressed: () async {
              final result = await context.showLocalizedSheet<bool>(
                isScrollControlled: true,
                builder: (_) => ChangePlanSheet(
                  repository: repository,
                  currentPlanId: 'pro',
                ),
              );
              onResult?.call(result);
            },
            child: const Text('open'),
          ),
        ),
      ),
    );

void main() {
  group(ChangePlanSheet, () {
    testWidgets('select a plan, see the proration note and confirm', (
      tester,
    ) async {
      final repository = FakeBillingRepository();
      bool? result;
      await const BillingTestApp().pump(
        tester,
        _host(repository, onResult: (value) => result = value),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(find.text(_es.changePlanTitle), findsOneWidget);
      expect(find.text(_es.currentPlanBadge), findsOneWidget);
      expect(find.text(_es.prorationNote), findsNothing);

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
      await const BillingTestApp().pump(
        tester,
        _host(repository, onResult: (value) => result = value),
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

    testWidgets('a failed save keeps the sheet open and usable', (
      tester,
    ) async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            count: 2,
            operation: BillingOperation.changePlan,
          ),
      );
      await const BillingTestApp().pump(tester, _host(repository));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Empresa'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(_es.confirmChange));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text(_es.changePlanTitle), findsOneWidget);
      expect(find.text(_es.changePlanError), findsOneWidget);
      await tester.tap(find.text(_es.confirmChange));
      await tester.pumpAndSettle();
      expect(find.text(_es.changePlanTitle), findsOneWidget);
    });

    testWidgets(
      'a plan the usage does not fit shows why instead of the generic failure',
      (tester) async {
        final repository = FakeBillingRepository(
          behavior: DemoBehavior()
            ..failNext(
              ApiErrorException(
                ProblemFixtures.withCode(
                  BillingErrorCode.planUsageExceedsLimit.code,
                  status: 409,
                ),
              ),
              operation: BillingOperation.changePlan,
            ),
        );
        await const BillingTestApp().pump(tester, _host(repository));
        await tester.tap(find.text('open'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Empresa'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(_es.confirmChange));
        await tester.pumpAndSettle();

        expect(
          find.textContaining(_shared.error_billing_plan_usage_exceeds_limit),
          findsOneWidget,
        );
        expect(find.text(_es.changePlanError), findsNothing);
        expect(find.text(_es.changePlanTitle), findsOneWidget);
      },
    );

    testWidgets('meets the accessibility guidelines', (tester) async {
      await const BillingTestApp().pump(tester, _host(FakeBillingRepository()));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });
  });
}
