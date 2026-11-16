import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/billing_plan_controller.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_billing_repository.dart';

void main() {
  group(BillingPlanController, () {
    test('starts loading', () {
      final controller = BillingPlanController(FakeBillingRepository());
      addTearDown(controller.dispose);

      expect(controller.overview, isA<AsyncLoading<PlanOverview>>());
    });

    test('start loads the subscription and the usage', () async {
      final controller = BillingPlanController(FakeBillingRepository());
      addTearDown(controller.dispose);

      await controller.start();

      final overview = controller.overview.valueOrNull!;
      expect(overview.subscription.id, 'sub_001');
      expect(overview.subscription.plan.id, 'pro');
      expect(overview.usage, hasLength(3));
    });

    test('a failure is an error state and a second start loads', () async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: BillingOperation.currentSubscription,
          ),
      );
      final controller = BillingPlanController(repository);
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.overview, isA<AsyncError<PlanOverview>>());

      await controller.start();
      expect(controller.overview.valueOrNull, isNotNull);
    });

    test('an answer to an older start does not replace a newer one', () async {
      final repository = GatedBillingRepository();
      final controller = BillingPlanController(repository);
      addTearDown(controller.dispose);

      final first = Completer<void>();
      repository.subscriptionGate = first;
      final a = controller.start();

      final second = Completer<void>();
      repository.subscriptionGate = second;
      final b = controller.start();
      second.complete();
      await b;

      repository.subscriptionGate = null;
      await repository.changePlan('empresa');
      first.complete();
      await a;

      expect(controller.overview.valueOrNull?.subscription.plan.id, 'pro');
    });

    test(
      'disposing with a start in flight neither throws nor notifies',
      () async {
        final repository = GatedBillingRepository();
        final gate = Completer<void>();
        repository.subscriptionGate = gate;
        final controller = BillingPlanController(repository);
        var notifications = 0;
        controller.addListener(() => notifications++);

        final pending = controller.start();
        controller.dispose();
        final before = notifications;
        gate.complete();
        await pending;

        expect(notifications, before);
      },
    );
  });
}
