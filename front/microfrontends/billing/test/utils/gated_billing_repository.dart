import 'dart:async';

import 'package:mf_billing/src/data/fake_billing_repository.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';

/// Demo repository whose answers wait for a gate, so a test decides the
/// order in which they arrive.
///
/// Each call reads its gate when it starts: a test can open a gate, put a new
/// one in its place and make a second call that waits for the new one. A null
/// gate lets the call through.
base class GatedBillingRepository extends FakeBillingRepository {
  /// Creates the repository with the demo data and [behavior].
  GatedBillingRepository({super.behavior});

  /// Gate of [currentSubscription].
  Completer<void>? subscriptionGate;

  /// Gate of [availablePlans].
  Completer<void>? plansGate;

  /// Gate of [changePlan].
  Completer<void>? changePlanGate;

  @override
  Future<Subscription> currentSubscription() async {
    await _pass(subscriptionGate);
    return super.currentSubscription();
  }

  @override
  Future<List<Plan>> availablePlans() async {
    await _pass(plansGate);
    return super.availablePlans();
  }

  @override
  Future<Subscription> changePlan(String planId) async {
    await _pass(changePlanGate);
    return super.changePlan(planId);
  }

  static Future<void> _pass(Completer<void>? gate) async {
    if (gate != null) await gate.future;
  }
}
