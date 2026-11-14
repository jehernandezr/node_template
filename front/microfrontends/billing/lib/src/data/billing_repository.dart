import 'package:shell_core/shell_core.dart';

import '../shared/types/billing_types.dart';

/// Read and plan-change operations of the billing service.
///
/// There is no billing contract in `package:contracts` yet, so
/// [FakeBillingRepository] is the only implementation. When the contract
/// exists, the real one uses `ApiClient` from `package:api`. The scope of the
/// identity closes it through [ScopedResource.dispose].
abstract interface class BillingRepository implements ScopedResource {
  /// Subscription of the current tenant.
  Future<Subscription> currentSubscription();

  /// Usage of every quota in the current plan, for the current period.
  Future<List<QuotaUsage>> currentUsage();

  /// Plans the tenant can switch to.
  Future<List<Plan>> availablePlans();

  /// Switches the subscription to [planId] and returns the result.
  Future<Subscription> changePlan(String planId);

  /// Invoices, newest first.
  Future<List<Invoice>> invoices();

  /// Invoice with [id], or null when it does not exist.
  Future<Invoice?> invoice(String id);
}
