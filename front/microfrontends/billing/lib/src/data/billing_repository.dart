import 'billing_models.dart';

/// Read and plan-change operations of the billing service.
///
/// Implementations talk to the API; [FakeBillingRepository] serves the
/// screens until the API is wired.
abstract interface class BillingRepository {
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
