import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/data/billing_repository.dart';
import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/screens/change_plan_controller.dart';
import 'package:mf_billing/src/screens/change_plan_state.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_billing_repository.dart';

void main() {
  group(ChangePlanController, () {
    ChangePlanController controllerFor(
      BillingRepository repository, {
      String currentPlanId = 'pro',
    }) {
      final controller = ChangePlanController(
        repository,
        currentPlanId: currentPlanId,
      );
      addTearDown(controller.dispose);
      return controller;
    }

    test('start passes through loading and ends choosing', () async {
      final controller = controllerFor(FakeBillingRepository());
      final states = <ChangePlanState>[];
      controller.addListener(() => states.add(controller.state));

      await controller.start();

      expect(states.first, isA<ChangePlanLoading>());
      expect(
        controller.state,
        isA<ChangePlanChoosing>()
            .having((s) => s.plans, 'plans', hasLength(3))
            .having((s) => s.selectedId, 'selectedId', isNull),
      );
    });

    test('the current plan cannot be selected', () async {
      final controller = controllerFor(FakeBillingRepository());
      await controller.start();

      controller.select('pro');

      expect(
        controller.state,
        isA<ChangePlanChoosing>().having(
          (s) => s.selectedId,
          'selectedId',
          isNull,
        ),
      );
      expect(controller.canConfirm, isFalse);
    });

    test('selecting another plan allows confirming', () async {
      final controller = controllerFor(FakeBillingRepository());
      await controller.start();

      controller.select('empresa');

      expect(controller.canConfirm, isTrue);
    });

    test(
      'a saved change ends done and the repository has the new plan',
      () async {
        final repository = FakeBillingRepository();
        final controller = controllerFor(repository);
        await controller.start();
        controller.select('empresa');

        final result = await controller.confirm();

        expect(result, isA<ActionSucceeded<Subscription>>());
        expect(controller.state, isA<ChangePlanDone>());
        expect((await repository.currentSubscription()).plan.id, 'empresa');
      },
    );

    test('a failed change keeps the plans and the selection', () async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: BillingOperation.changePlan,
          ),
      );
      final controller = controllerFor(repository);
      await controller.start();
      controller.select('empresa');

      final result = await controller.confirm();

      expect(result, isA<ActionFailed<Subscription>>());
      expect(
        controller.state,
        isA<ChangePlanFailed>()
            .having((s) => s.plans, 'plans', hasLength(3))
            .having((s) => s.selectedId, 'selectedId', 'empresa'),
      );
      expect(controller.canConfirm, isTrue);

      final retry = await controller.confirm();

      expect(retry, isA<ActionSucceeded<Subscription>>());
    });

    test('confirm without a selection is skipped', () async {
      final controller = controllerFor(FakeBillingRepository());
      await controller.start();

      final result = await controller.confirm();

      expect(result, isA<ActionSkipped<Subscription>>());
    });

    test('a second confirm while saving is skipped', () async {
      final repository = GatedBillingRepository();
      final gate = Completer<void>();
      repository.changePlanGate = gate;
      final controller = controllerFor(repository);
      await controller.start();
      controller.select('empresa');

      final first = controller.confirm();
      expect(controller.state, isA<ChangePlanSaving>());

      final second = await controller.confirm();

      expect(second, isA<ActionSkipped<Subscription>>());
      expect(controller.state, isA<ChangePlanSaving>());

      gate.complete();
      await first;
    });

    test('a failed plan list is a failed state with no plans', () async {
      final repository = FakeBillingRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: BillingOperation.availablePlans,
          ),
      );
      final controller = controllerFor(repository);

      await controller.start();

      expect(
        controller.state,
        isA<ChangePlanFailed>().having((s) => s.plans, 'plans', isEmpty),
      );

      await controller.start();

      expect(controller.state, isA<ChangePlanChoosing>());
    });

    test(
      'disposing with a start in flight neither throws nor notifies',
      () async {
        final repository = GatedBillingRepository();
        final gate = Completer<void>();
        repository.plansGate = gate;
        final controller = ChangePlanController(
          repository,
          currentPlanId: 'pro',
        );
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
