import 'package:api/api.dart';
import 'package:contracts/contracts.dart' as api;

import '../shared/constants/billing_constants.dart';
import '../shared/types/billing_types.dart';
import 'billing_mapper.dart';
import 'billing_repository.dart';

/// [BillingRepository] over the billing API, with the generated
/// [api.BillingRoutes] and [ApiClient], which validates every request before
/// it is sent. Problems reach the caller as [api.ApiErrorException], except
/// `BILLING.INVOICE.NOT_FOUND`, which [invoice] answers as null.
final class ApiBillingRepository implements BillingRepository {
  /// Repository over the billing API through [_client].
  ApiBillingRepository({required this._client});

  final ApiClient _client;

  @override
  Future<Subscription> currentSubscription() async =>
      BillingMapper.subscription(
        await _client.send(
          api.BillingRoutes.getSubscription,
          const api.Empty(),
        ),
      );

  @override
  Future<List<QuotaUsage>> currentUsage() async {
    final overview = await _client.send(
      api.BillingRoutes.getUsage,
      const api.Empty(),
    );
    return [for (final usage in overview.items) BillingMapper.usage(usage)];
  }

  @override
  Future<List<Plan>> availablePlans() async {
    final catalog = await _client.send(
      api.BillingRoutes.listPlans,
      const api.Empty(),
    );
    return [for (final plan in catalog.items) BillingMapper.plan(plan)];
  }

  @override
  Future<Subscription> changePlan(String planId) async =>
      BillingMapper.subscription(
        await _client.send(
          api.BillingRoutes.changePlan,
          api.ChangePlanRequest(planId: planId),
        ),
      );

  @override
  Future<List<InvoiceSummary>> invoices() async {
    final page = await _client.send(
      api.BillingRoutes.listInvoices,
      const api.ListInvoicesRequest(limit: billingInvoicesPageSize),
    );
    return [
      for (final invoice in page.items) BillingMapper.invoiceSummary(invoice),
    ];
  }

  @override
  Future<Invoice?> invoice(String id) async {
    try {
      return BillingMapper.invoice(
        await _client.send(
          api.BillingRoutes.getInvoice,
          api.GetInvoiceRequest(invoiceId: id),
        ),
      );
    } on api.ApiErrorException catch (error) {
      if (error.problem.code == api.BillingErrorCode.invoiceNotFound.code) {
        return null;
      }
      rethrow;
    }
  }

  @override
  void dispose() {}
}
