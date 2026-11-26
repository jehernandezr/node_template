/// Domain models for plans, subscriptions, metered usage and invoices.
///
/// Money is the contract's `MoneyAmount`: integer minor units plus the ISO
/// currency, never a double. Screens show it with `utils.formatMoney`.
library;

import 'package:contracts/contracts.dart' show MoneyAmount;

import '../constants/billing_constants.dart';
import '../enums/billing_enums.dart';

/// Level for [used] out of [limit]: warning from [usageWarningPercent], danger
/// from [usageDangerPercent].
///
/// A non-positive [limit] is always danger.
UsageLevel usageLevelFor(int used, int limit) {
  if (limit <= 0 || used * 100 >= limit * usageDangerPercent) {
    return UsageLevel.danger;
  }
  if (used * 100 >= limit * usageWarningPercent) return UsageLevel.warning;
  return UsageLevel.normal;
}

/// Calendar range of a billing period, by date, both ends included.
final class BillingPeriod {
  /// Period from [start] to [end], both included.
  const BillingPeriod({required this.start, required this.end});

  /// First day of the period.
  final DateTime start;

  /// Last day of the period (inclusive).
  final DateTime end;
}

/// A metered limit included in a plan.
final class Quota {
  /// Quota [key] with its [limit].
  const Quota({required this.key, required this.limit});

  /// Which limit this is. Matches usage with the quota and picks the label.
  final UsageMetric key;

  /// Maximum amount included in the plan for one period.
  final int limit;
}

/// A catalog plan.
final class Plan {
  /// Plan with its price, periodicity and quotas.
  const Plan({
    required this.id,
    required this.name,
    required this.price,
    required this.periodicity,
    required this.quotas,
  });

  /// Identifier in the catalog.
  final String id;

  /// Display name.
  final String name;

  /// Price per [periodicity].
  final MoneyAmount price;

  /// How often [price] is charged.
  final PlanPeriodicity periodicity;

  /// Metered limits included in the plan.
  final List<Quota> quotas;
}

/// Consumption of one quota in the current period.
final class QuotaUsage {
  /// Usage of [quota], [used] units so far.
  const QuotaUsage({required this.quota, required this.used});

  /// The quota being measured.
  final Quota quota;

  /// Amount consumed so far in the period.
  final int used;

  /// Consumed share of the limit. Not clamped; a limit of zero gives 1.
  double get ratio => quota.limit <= 0 ? 1 : used / quota.limit;

  /// Meter severity for this usage.
  UsageLevel get level => usageLevelFor(used, quota.limit);
}

/// The tenant's subscription to a plan.
final class Subscription {
  /// Subscription with its plan, status and period.
  const Subscription({
    required this.id,
    required this.plan,
    required this.status,
    required this.period,
  });

  /// Identifier of the subscription.
  final String id;

  /// Plan in force.
  final Plan plan;

  /// Lifecycle state.
  final SubscriptionStatus status;

  /// Current billing period.
  final BillingPeriod period;
}

/// One charge on an invoice.
final class InvoiceLine {
  /// Line of an invoice.
  const InvoiceLine({
    required this.kind,
    required this.description,
    required this.amount,
  });

  /// Fixed plan charge or metered usage.
  final InvoiceLineKind kind;

  /// Text shown for the line.
  final String description;

  /// Amount of the line, in the invoice currency.
  final MoneyAmount amount;
}

/// What the invoice list shows of an invoice: no lines, only its total.
final class InvoiceSummary {
  /// Row of the invoice list.
  const InvoiceSummary({
    required this.id,
    required this.number,
    required this.period,
    required this.status,
    required this.total,
  });

  /// Identifier used in routes.
  final String id;

  /// Human-facing invoice number.
  final String number;

  /// Period the invoice covers.
  final BillingPeriod period;

  /// Lifecycle state.
  final InvoiceStatus status;

  /// Sum of all the lines.
  final MoneyAmount total;
}

/// A billing document for one period.
final class Invoice {
  /// Invoice with its lines and totals.
  const Invoice({
    required this.id,
    required this.number,
    required this.period,
    required this.status,
    required this.currency,
    required this.lines,
  });

  /// Identifier used in routes.
  final String id;

  /// Human-facing invoice number.
  final String number;

  /// Period the invoice covers.
  final BillingPeriod period;

  /// Lifecycle state.
  final InvoiceStatus status;

  /// Currency of every line.
  final Currency currency;

  /// Charges in display order.
  final List<InvoiceLine> lines;

  /// Sum of all line amounts.
  MoneyAmount get total => MoneyAmount(
    amountMinor: lines.fold(0, (sum, line) => sum + line.amount.amountMinor),
    currency: currency.wireCode,
  );

  /// This invoice as the list shows it.
  InvoiceSummary get summary => InvoiceSummary(
    id: id,
    number: number,
    period: period,
    status: status,
    total: total,
  );
}

/// What the plan page shows: the subscription and the usage of each quota.
final class PlanOverview {
  /// Subscription and usage shown on the plan screen.
  const PlanOverview({required this.subscription, required this.usage});

  /// Subscription of the tenant.
  final Subscription subscription;

  /// Usage of every quota of the plan in force.
  final List<QuotaUsage> usage;
}
