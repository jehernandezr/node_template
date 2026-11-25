import 'package:contracts/contracts.dart' as api;

import '../shared/types/billing_types.dart';

/// Converts the types of the billing contract into the ones the screens use.
abstract final class BillingMapper {
  static Subscription subscription(api.Subscription subscription) =>
      Subscription(
        id: subscription.id,
        plan: plan(subscription.plan),
        status: subscription.status,
        period: _period(subscription.period),
      );

  static Plan plan(api.Plan plan) => Plan(
    id: plan.id,
    name: plan.name,
    price: plan.price,
    periodicity: plan.periodicity,
    quotas: [
      for (final quota in plan.quotas)
        Quota(key: quota.metric, limit: quota.limit),
    ],
  );

  static QuotaUsage usage(api.QuotaUsage usage) => QuotaUsage(
    quota: Quota(key: usage.metric, limit: usage.limit),
    used: usage.used,
  );

  static Invoice invoice(api.Invoice invoice) => Invoice(
    id: invoice.id,
    number: invoice.number,
    period: _period(invoice.period),
    status: invoice.status,
    currency: invoice.currency,
    lines: [
      for (final line in invoice.lines)
        InvoiceLine(
          kind: line.kind,
          description: line.description,
          amount: line.amount,
        ),
    ],
  );

  static InvoiceSummary invoiceSummary(api.InvoiceSummary invoice) =>
      InvoiceSummary(
        id: invoice.id,
        number: invoice.number,
        period: _period(invoice.period),
        status: invoice.status,
        total: invoice.total,
      );

  /// The contract sends the period as two calendar dates.
  static BillingPeriod _period(api.BillingPeriod period) => BillingPeriod(
    start: DateTime.parse(period.start),
    end: DateTime.parse(period.end),
  );
}
