// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../billing/enums/billing_enums.dart';
import '../../core/core.dart';
import '../../identity/enums/identity_enums.dart';
import '../../platform/types/platform_types.dart';

/// Billing period with calendar dates.
@immutable
final class BillingPeriod {
  const BillingPeriod({required this.start, required this.end});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory BillingPeriod.fromJson(Map<String, dynamic> json) {
    try {
      return BillingPeriod(
        start: json['start'] as String,
        end: json['end'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid BillingPeriod: $error', json);
    }
  }

  final String start;

  final String end;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'start': start,
    'end': end,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(BillingPeriod value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BillingPeriod &&
          contractEquals(start, other.start) &&
          contractEquals(end, other.end);

  @override
  int get hashCode => contractHash([start, end]);
}

/// Limit of a metric in a plan.
@immutable
final class QuotaLimit {
  const QuotaLimit({required this.metric, required this.limit});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory QuotaLimit.fromJson(Map<String, dynamic> json) {
    try {
      return QuotaLimit(
        metric: decodeEnum(json['metric'], UsageMetric.tryParse, 'UsageMetric'),
        limit: (json['limit'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid QuotaLimit: $error', json);
    }
  }

  final UsageMetric metric;

  final int limit;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(QuotaLimit value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuotaLimit &&
          contractEquals(metric, other.metric) &&
          contractEquals(limit, other.limit);

  @override
  int get hashCode => contractHash([metric, limit]);
}

/// Usage of a metric in a window, with its idempotency key.
@immutable
final class UsageRecord {
  const UsageRecord({
    required this.metric,
    required this.quantity,
    required this.windowStart,
    required this.key,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UsageRecord.fromJson(Map<String, dynamic> json) {
    try {
      return UsageRecord(
        metric: decodeEnum(json['metric'], UsageMetric.tryParse, 'UsageMetric'),
        quantity: (json['quantity'] as num).toInt(),
        windowStart: DateTime.parse(json['windowStart'] as String),
        key: json['key'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UsageRecord: $error', json);
    }
  }

  final UsageMetric metric;

  final int quantity;

  final DateTime windowStart;

  final String key;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'quantity': quantity,
    'windowStart': windowStart.toUtc().toIso8601String(),
    'key': key,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UsageRecord value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UsageRecord &&
          contractEquals(metric, other.metric) &&
          contractEquals(quantity, other.quantity) &&
          contractEquals(windowStart, other.windowStart) &&
          contractEquals(key, other.key);

  @override
  int get hashCode => contractHash([metric, quantity, windowStart, key]);
}

/// Batch of usage records of a tenant.
@immutable
final class RecordUsagePayload {
  const RecordUsagePayload({required this.tenantId, required this.records});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RecordUsagePayload.fromJson(Map<String, dynamic> json) {
    try {
      return RecordUsagePayload(
        tenantId: json['tenantId'] as String,
        records: [
          for (final e0 in json['records'] as List<dynamic>)
            UsageRecord.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RecordUsagePayload: $error', json);
    }
  }

  final String tenantId;

  final List<UsageRecord> records;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'records': [for (final e0 in records) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RecordUsagePayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecordUsagePayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(records, other.records);

  @override
  int get hashCode => contractHash([tenantId, records]);
}

/// The plan of a subscription changed.
@immutable
final class SubscriptionChangedPayload {
  const SubscriptionChangedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.previousPlanId,
    required this.planId,
    required this.changedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SubscriptionChangedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return SubscriptionChangedPayload(
        tenantId: json['tenantId'] as String,
        subscriptionId: json['subscriptionId'] as String,
        previousPlanId: json['previousPlanId'] as String?,
        planId: json['planId'] as String,
        changedAt: DateTime.parse(json['changedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SubscriptionChangedPayload: $error', json);
    }
  }

  final String tenantId;

  final String subscriptionId;

  final String? previousPlanId;

  final String planId;

  final DateTime changedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'previousPlanId': previousPlanId,
    'planId': planId,
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SubscriptionChangedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubscriptionChangedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(subscriptionId, other.subscriptionId) &&
          contractEquals(previousPlanId, other.previousPlanId) &&
          contractEquals(planId, other.planId) &&
          contractEquals(changedAt, other.changedAt);

  @override
  int get hashCode => contractHash([
    tenantId,
    subscriptionId,
    previousPlanId,
    planId,
    changedAt,
  ]);
}

/// A subscription was suspended for non-payment.
@immutable
final class SubscriptionSuspendedPayload {
  const SubscriptionSuspendedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.suspendedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SubscriptionSuspendedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return SubscriptionSuspendedPayload(
        tenantId: json['tenantId'] as String,
        subscriptionId: json['subscriptionId'] as String,
        suspendedAt: DateTime.parse(json['suspendedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid SubscriptionSuspendedPayload: $error',
        json,
      );
    }
  }

  final String tenantId;

  final String subscriptionId;

  final DateTime suspendedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'suspendedAt': suspendedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SubscriptionSuspendedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubscriptionSuspendedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(subscriptionId, other.subscriptionId) &&
          contractEquals(suspendedAt, other.suspendedAt);

  @override
  int get hashCode => contractHash([tenantId, subscriptionId, suspendedAt]);
}

/// A suspended subscription was reactivated.
@immutable
final class SubscriptionReactivatedPayload {
  const SubscriptionReactivatedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.reactivatedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SubscriptionReactivatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return SubscriptionReactivatedPayload(
        tenantId: json['tenantId'] as String,
        subscriptionId: json['subscriptionId'] as String,
        reactivatedAt: DateTime.parse(json['reactivatedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid SubscriptionReactivatedPayload: $error',
        json,
      );
    }
  }

  final String tenantId;

  final String subscriptionId;

  final DateTime reactivatedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'reactivatedAt': reactivatedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SubscriptionReactivatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubscriptionReactivatedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(subscriptionId, other.subscriptionId) &&
          contractEquals(reactivatedAt, other.reactivatedAt);

  @override
  int get hashCode => contractHash([tenantId, subscriptionId, reactivatedAt]);
}

/// The active features or quotas of a tenant changed.
@immutable
final class EntitlementsChangedPayload {
  const EntitlementsChangedPayload({
    required this.tenantId,
    required this.features,
    required this.quotas,
    required this.changedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EntitlementsChangedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return EntitlementsChangedPayload(
        tenantId: json['tenantId'] as String,
        features: [
          for (final e0 in json['features'] as List<dynamic>)
            ?PlanFeature.tryParse(e0 as String),
        ],
        quotas: [
          for (final e0 in json['quotas'] as List<dynamic>)
            QuotaLimit.fromJson(e0 as Map<String, dynamic>),
        ],
        changedAt: DateTime.parse(json['changedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EntitlementsChangedPayload: $error', json);
    }
  }

  final String tenantId;

  final List<PlanFeature> features;

  final List<QuotaLimit> quotas;

  final DateTime changedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'features': [for (final e0 in features) e0.wireCode],
    'quotas': [for (final e0 in quotas) e0.toJson()],
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EntitlementsChangedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EntitlementsChangedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(features, other.features) &&
          contractEquals(quotas, other.quotas) &&
          contractEquals(changedAt, other.changedAt);

  @override
  int get hashCode => contractHash([tenantId, features, quotas, changedAt]);
}

/// An invoice was issued.
@immutable
final class InvoiceIssuedPayload {
  const InvoiceIssuedPayload({
    required this.tenantId,
    required this.invoiceId,
    required this.number,
    required this.period,
    required this.total,
    required this.issuedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceIssuedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceIssuedPayload(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        number: json['number'] as String,
        period: BillingPeriod.fromJson(json['period'] as Map<String, dynamic>),
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
        issuedAt: DateTime.parse(json['issuedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceIssuedPayload: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final String number;

  final BillingPeriod period;

  final MoneyAmount total;

  final DateTime issuedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'period': period.toJson(),
    'total': total.toJson(),
    'issuedAt': issuedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceIssuedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceIssuedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(number, other.number) &&
          contractEquals(period, other.period) &&
          contractEquals(total, other.total) &&
          contractEquals(issuedAt, other.issuedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, invoiceId, number, period, total, issuedAt]);
}

/// An invoice was paid.
@immutable
final class InvoicePaidPayload {
  const InvoicePaidPayload({
    required this.tenantId,
    required this.invoiceId,
    required this.number,
    required this.total,
    required this.paidAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoicePaidPayload.fromJson(Map<String, dynamic> json) {
    try {
      return InvoicePaidPayload(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        number: json['number'] as String,
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
        paidAt: DateTime.parse(json['paidAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoicePaidPayload: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final String number;

  final MoneyAmount total;

  final DateTime paidAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'total': total.toJson(),
    'paidAt': paidAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoicePaidPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoicePaidPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(number, other.number) &&
          contractEquals(total, other.total) &&
          contractEquals(paidAt, other.paidAt);

  @override
  int get hashCode =>
      contractHash([tenantId, invoiceId, number, total, paidAt]);
}

/// Charging an invoice failed.
@immutable
final class InvoiceFailedPayload {
  const InvoiceFailedPayload({
    required this.tenantId,
    required this.invoiceId,
    required this.number,
    required this.total,
    required this.attempts,
    required this.failedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceFailedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceFailedPayload(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        number: json['number'] as String,
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
        attempts: (json['attempts'] as num).toInt(),
        failedAt: DateTime.parse(json['failedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceFailedPayload: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final String number;

  final MoneyAmount total;

  final int attempts;

  final DateTime failedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'total': total.toJson(),
    'attempts': attempts,
    'failedAt': failedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceFailedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceFailedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(number, other.number) &&
          contractEquals(total, other.total) &&
          contractEquals(attempts, other.attempts) &&
          contractEquals(failedAt, other.failedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, invoiceId, number, total, attempts, failedAt]);
}

/// Catalog plan with its price and limits.
@immutable
final class Plan {
  const Plan({
    required this.id,
    required this.name,
    required this.price,
    required this.periodicity,
    required this.quotas,
    required this.features,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Plan.fromJson(Map<String, dynamic> json) {
    try {
      return Plan(
        id: json['id'] as String,
        name: json['name'] as String,
        price: MoneyAmount.fromJson(json['price'] as Map<String, dynamic>),
        periodicity: decodeEnum(
          json['periodicity'],
          PlanPeriodicity.tryParse,
          'PlanPeriodicity',
        ),
        quotas: [
          for (final e0 in json['quotas'] as List<dynamic>)
            QuotaLimit.fromJson(e0 as Map<String, dynamic>),
        ],
        features: [
          for (final e0 in json['features'] as List<dynamic>)
            ?PlanFeature.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Plan: $error', json);
    }
  }

  final String id;

  final String name;

  final MoneyAmount price;

  final PlanPeriodicity periodicity;

  final List<QuotaLimit> quotas;

  final List<PlanFeature> features;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'price': price.toJson(),
    'periodicity': periodicity.wireCode,
    'quotas': [for (final e0 in quotas) e0.toJson()],
    'features': [for (final e0 in features) e0.wireCode],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Plan value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Plan &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(price, other.price) &&
          contractEquals(periodicity, other.periodicity) &&
          contractEquals(quotas, other.quotas) &&
          contractEquals(features, other.features);

  @override
  int get hashCode =>
      contractHash([id, name, price, periodicity, quotas, features]);
}

/// Catalog of available plans.
@immutable
final class PlanCatalog {
  const PlanCatalog({required this.items});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PlanCatalog.fromJson(Map<String, dynamic> json) {
    try {
      return PlanCatalog(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            Plan.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PlanCatalog: $error', json);
    }
  }

  final List<Plan> items;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PlanCatalog value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanCatalog && contractEquals(items, other.items);

  @override
  int get hashCode => contractHash([items]);
}

/// Tenant subscription with its plan and current period.
@immutable
final class Subscription {
  const Subscription({
    required this.id,
    required this.plan,
    required this.status,
    required this.period,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Subscription.fromJson(Map<String, dynamic> json) {
    try {
      return Subscription(
        id: json['id'] as String,
        plan: Plan.fromJson(json['plan'] as Map<String, dynamic>),
        status: decodeEnum(
          json['status'],
          SubscriptionStatus.tryParse,
          'SubscriptionStatus',
        ),
        period: BillingPeriod.fromJson(json['period'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Subscription: $error', json);
    }
  }

  final String id;

  final Plan plan;

  final SubscriptionStatus status;

  final BillingPeriod period;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'plan': plan.toJson(),
    'status': status.wireCode,
    'period': period.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Subscription value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Subscription &&
          contractEquals(id, other.id) &&
          contractEquals(plan, other.plan) &&
          contractEquals(status, other.status) &&
          contractEquals(period, other.period);

  @override
  int get hashCode => contractHash([id, plan, status, period]);
}

/// Usage of a metric against its limit.
@immutable
final class QuotaUsage {
  const QuotaUsage({
    required this.metric,
    required this.limit,
    required this.used,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory QuotaUsage.fromJson(Map<String, dynamic> json) {
    try {
      return QuotaUsage(
        metric: decodeEnum(json['metric'], UsageMetric.tryParse, 'UsageMetric'),
        limit: (json['limit'] as num).toInt(),
        used: (json['used'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid QuotaUsage: $error', json);
    }
  }

  final UsageMetric metric;

  final int limit;

  final int used;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
    'used': used,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(QuotaUsage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuotaUsage &&
          contractEquals(metric, other.metric) &&
          contractEquals(limit, other.limit) &&
          contractEquals(used, other.used);

  @override
  int get hashCode => contractHash([metric, limit, used]);
}

/// Current period usage of each metric with a quota.
@immutable
final class UsageOverview {
  const UsageOverview({required this.items});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UsageOverview.fromJson(Map<String, dynamic> json) {
    try {
      return UsageOverview(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            QuotaUsage.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UsageOverview: $error', json);
    }
  }

  final List<QuotaUsage> items;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UsageOverview value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UsageOverview && contractEquals(items, other.items);

  @override
  int get hashCode => contractHash([items]);
}

/// Invoice line.
@immutable
final class InvoiceLine {
  const InvoiceLine({
    required this.kind,
    required this.description,
    required this.amount,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceLine.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceLine(
        kind: decodeEnum(
          json['kind'],
          InvoiceLineKind.tryParse,
          'InvoiceLineKind',
        ),
        description: json['description'] as String,
        amount: MoneyAmount.fromJson(json['amount'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceLine: $error', json);
    }
  }

  final InvoiceLineKind kind;

  final String description;

  final MoneyAmount amount;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'kind': kind.wireCode,
    'description': description,
    'amount': amount.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceLine value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceLine &&
          contractEquals(kind, other.kind) &&
          contractEquals(description, other.description) &&
          contractEquals(amount, other.amount);

  @override
  int get hashCode => contractHash([kind, description, amount]);
}

/// Full invoice with its lines.
@immutable
final class Invoice {
  const Invoice({
    required this.id,
    required this.number,
    required this.period,
    required this.status,
    required this.currency,
    required this.lines,
    required this.total,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Invoice.fromJson(Map<String, dynamic> json) {
    try {
      return Invoice(
        id: json['id'] as String,
        number: json['number'] as String,
        period: BillingPeriod.fromJson(json['period'] as Map<String, dynamic>),
        status: decodeEnum(
          json['status'],
          InvoiceStatus.tryParse,
          'InvoiceStatus',
        ),
        currency: decodeEnum(json['currency'], Currency.tryParse, 'Currency'),
        lines: [
          for (final e0 in json['lines'] as List<dynamic>)
            InvoiceLine.fromJson(e0 as Map<String, dynamic>),
        ],
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Invoice: $error', json);
    }
  }

  final String id;

  final String number;

  final BillingPeriod period;

  final InvoiceStatus status;

  final Currency currency;

  final List<InvoiceLine> lines;

  final MoneyAmount total;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'number': number,
    'period': period.toJson(),
    'status': status.wireCode,
    'currency': currency.wireCode,
    'lines': [for (final e0 in lines) e0.toJson()],
    'total': total.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Invoice value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Invoice &&
          contractEquals(id, other.id) &&
          contractEquals(number, other.number) &&
          contractEquals(period, other.period) &&
          contractEquals(status, other.status) &&
          contractEquals(currency, other.currency) &&
          contractEquals(lines, other.lines) &&
          contractEquals(total, other.total);

  @override
  int get hashCode =>
      contractHash([id, number, period, status, currency, lines, total]);
}

/// Invoice without lines, for listings.
@immutable
final class InvoiceSummary {
  const InvoiceSummary({
    required this.id,
    required this.number,
    required this.period,
    required this.status,
    required this.currency,
    required this.total,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceSummary.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceSummary(
        id: json['id'] as String,
        number: json['number'] as String,
        period: BillingPeriod.fromJson(json['period'] as Map<String, dynamic>),
        status: decodeEnum(
          json['status'],
          InvoiceStatus.tryParse,
          'InvoiceStatus',
        ),
        currency: decodeEnum(json['currency'], Currency.tryParse, 'Currency'),
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceSummary: $error', json);
    }
  }

  final String id;

  final String number;

  final BillingPeriod period;

  final InvoiceStatus status;

  final Currency currency;

  final MoneyAmount total;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'number': number,
    'period': period.toJson(),
    'status': status.wireCode,
    'currency': currency.wireCode,
    'total': total.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceSummary &&
          contractEquals(id, other.id) &&
          contractEquals(number, other.number) &&
          contractEquals(period, other.period) &&
          contractEquals(status, other.status) &&
          contractEquals(currency, other.currency) &&
          contractEquals(total, other.total);

  @override
  int get hashCode =>
      contractHash([id, number, period, status, currency, total]);
}

/// Page of invoices, newest first.
@immutable
final class InvoicePage {
  const InvoicePage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoicePage.fromJson(Map<String, dynamic> json) {
    try {
      return InvoicePage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            InvoiceSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoicePage: $error', json);
    }
  }

  final List<InvoiceSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoicePage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoicePage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Plan the subscription changes to.
@immutable
final class ChangePlanRequest {
  const ChangePlanRequest({required this.planId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ChangePlanRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ChangePlanRequest(planId: json['planId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid ChangePlanRequest: $error', json);
    }
  }

  final String planId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'planId': planId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ChangePlanRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChangePlanRequest && contractEquals(planId, other.planId);

  @override
  int get hashCode => contractHash([planId]);
}

/// Filters and pagination of the invoice listing.
@immutable
final class ListInvoicesRequest {
  const ListInvoicesRequest({this.status, this.limit, this.after});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListInvoicesRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ListInvoicesRequest(
        status: json['status'] == null
            ? null
            : decodeEnum(
                json['status'],
                InvoiceStatus.tryParse,
                'InvoiceStatus',
              ),
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListInvoicesRequest: $error', json);
    }
  }

  final InvoiceStatus? status;

  final int? limit;

  final String? after;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    if (status case final value?) 'status': value.wireCode,
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListInvoicesRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListInvoicesRequest &&
          contractEquals(status, other.status) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([status, limit, after]);
}

/// Invoice to query.
@immutable
final class GetInvoiceRequest {
  const GetInvoiceRequest({required this.invoiceId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GetInvoiceRequest.fromJson(Map<String, dynamic> json) {
    try {
      return GetInvoiceRequest(invoiceId: json['invoiceId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetInvoiceRequest: $error', json);
    }
  }

  final String invoiceId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'invoiceId': invoiceId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GetInvoiceRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetInvoiceRequest && contractEquals(invoiceId, other.invoiceId);

  @override
  int get hashCode => contractHash([invoiceId]);
}

/// Opens the billing account of a new tenant.
@immutable
final class OpenBillingAccountInput {
  const OpenBillingAccountInput({
    required this.tenantId,
    required this.ownerUserId,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory OpenBillingAccountInput.fromJson(Map<String, dynamic> json) {
    try {
      return OpenBillingAccountInput(
        tenantId: json['tenantId'] as String,
        ownerUserId: json['ownerUserId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid OpenBillingAccountInput: $error', json);
    }
  }

  final String tenantId;

  final String ownerUserId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'ownerUserId': ownerUserId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(OpenBillingAccountInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OpenBillingAccountInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(ownerUserId, other.ownerUserId);

  @override
  int get hashCode => contractHash([tenantId, ownerUserId]);
}

/// Billing account opened with its subscription.
@immutable
final class BillingAccountResult {
  const BillingAccountResult({
    required this.tenantId,
    required this.subscriptionId,
    required this.status,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory BillingAccountResult.fromJson(Map<String, dynamic> json) {
    try {
      return BillingAccountResult(
        tenantId: json['tenantId'] as String,
        subscriptionId: json['subscriptionId'] as String,
        status: decodeEnum(
          json['status'],
          SubscriptionStatus.tryParse,
          'SubscriptionStatus',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid BillingAccountResult: $error', json);
    }
  }

  final String tenantId;

  final String subscriptionId;

  final SubscriptionStatus status;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'status': status.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(BillingAccountResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BillingAccountResult &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(subscriptionId, other.subscriptionId) &&
          contractEquals(status, other.status);

  @override
  int get hashCode => contractHash([tenantId, subscriptionId, status]);
}

/// Closes the billing account of a tenant.
@immutable
final class CloseBillingAccountInput {
  const CloseBillingAccountInput({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CloseBillingAccountInput.fromJson(Map<String, dynamic> json) {
    try {
      return CloseBillingAccountInput(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid CloseBillingAccountInput: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CloseBillingAccountInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CloseBillingAccountInput &&
          contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Billing account closed.
@immutable
final class BillingAccountClosed {
  const BillingAccountClosed({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory BillingAccountClosed.fromJson(Map<String, dynamic> json) {
    try {
      return BillingAccountClosed(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid BillingAccountClosed: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(BillingAccountClosed value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BillingAccountClosed && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Tenant whose features and quotas are queried.
@immutable
final class GetEntitlementsInput {
  const GetEntitlementsInput({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GetEntitlementsInput.fromJson(Map<String, dynamic> json) {
    try {
      return GetEntitlementsInput(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetEntitlementsInput: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GetEntitlementsInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetEntitlementsInput && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Active features and quotas of a tenant.
@immutable
final class Entitlements {
  const Entitlements({
    required this.tenantId,
    required this.status,
    required this.features,
    required this.quotas,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Entitlements.fromJson(Map<String, dynamic> json) {
    try {
      return Entitlements(
        tenantId: json['tenantId'] as String,
        status: decodeEnum(
          json['status'],
          SubscriptionStatus.tryParse,
          'SubscriptionStatus',
        ),
        features: [
          for (final e0 in json['features'] as List<dynamic>)
            ?PlanFeature.tryParse(e0 as String),
        ],
        quotas: [
          for (final e0 in json['quotas'] as List<dynamic>)
            QuotaLimit.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Entitlements: $error', json);
    }
  }

  final String tenantId;

  final SubscriptionStatus status;

  final List<PlanFeature> features;

  final List<QuotaLimit> quotas;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'status': status.wireCode,
    'features': [for (final e0 in features) e0.wireCode],
    'quotas': [for (final e0 in quotas) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Entitlements value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Entitlements &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(status, other.status) &&
          contractEquals(features, other.features) &&
          contractEquals(quotas, other.quotas);

  @override
  int get hashCode => contractHash([tenantId, status, features, quotas]);
}

/// Checks whether a tenant can consume an amount of a metric.
@immutable
final class CheckQuotaInput {
  const CheckQuotaInput({
    required this.tenantId,
    required this.metric,
    this.requested,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CheckQuotaInput.fromJson(Map<String, dynamic> json) {
    try {
      return CheckQuotaInput(
        tenantId: json['tenantId'] as String,
        metric: decodeEnum(json['metric'], UsageMetric.tryParse, 'UsageMetric'),
        requested: json['requested'] == null
            ? null
            : (json['requested'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CheckQuotaInput: $error', json);
    }
  }

  final String tenantId;

  final UsageMetric metric;

  final int? requested;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'metric': metric.wireCode,
    'requested': ?requested,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CheckQuotaInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CheckQuotaInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(metric, other.metric) &&
          contractEquals(requested, other.requested);

  @override
  int get hashCode => contractHash([tenantId, metric, requested]);
}

/// Result of a quota check.
@immutable
final class QuotaCheck {
  const QuotaCheck({
    required this.metric,
    required this.limit,
    required this.used,
    required this.allowed,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory QuotaCheck.fromJson(Map<String, dynamic> json) {
    try {
      return QuotaCheck(
        metric: decodeEnum(json['metric'], UsageMetric.tryParse, 'UsageMetric'),
        limit: (json['limit'] as num).toInt(),
        used: (json['used'] as num).toInt(),
        allowed: json['allowed'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid QuotaCheck: $error', json);
    }
  }

  final UsageMetric metric;

  final int limit;

  final int used;

  final bool allowed;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
    'used': used,
    'allowed': allowed,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(QuotaCheck value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuotaCheck &&
          contractEquals(metric, other.metric) &&
          contractEquals(limit, other.limit) &&
          contractEquals(used, other.used) &&
          contractEquals(allowed, other.allowed);

  @override
  int get hashCode => contractHash([metric, limit, used, allowed]);
}

/// Marks an invoice as paid with the provider reference.
@immutable
final class MarkInvoicePaidInput {
  const MarkInvoicePaidInput({
    required this.tenantId,
    required this.invoiceId,
    required this.paidAt,
    required this.reference,
    required this.amount,
    this.attemptId,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MarkInvoicePaidInput.fromJson(Map<String, dynamic> json) {
    try {
      return MarkInvoicePaidInput(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        paidAt: DateTime.parse(json['paidAt'] as String),
        reference: json['reference'] as String,
        amount: MoneyAmount.fromJson(json['amount'] as Map<String, dynamic>),
        attemptId: json['attemptId'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MarkInvoicePaidInput: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final DateTime paidAt;

  final String reference;

  final MoneyAmount amount;

  final String? attemptId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'paidAt': paidAt.toUtc().toIso8601String(),
    'reference': reference,
    'amount': amount.toJson(),
    'attemptId': ?attemptId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MarkInvoicePaidInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkInvoicePaidInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(paidAt, other.paidAt) &&
          contractEquals(reference, other.reference) &&
          contractEquals(amount, other.amount) &&
          contractEquals(attemptId, other.attemptId);

  @override
  int get hashCode =>
      contractHash([tenantId, invoiceId, paidAt, reference, amount, attemptId]);
}

/// Marks an invoice as failed after a declined charge.
@immutable
final class MarkInvoiceFailedInput {
  const MarkInvoiceFailedInput({
    required this.tenantId,
    required this.invoiceId,
    required this.failedAt,
    this.reason,
    this.attemptId,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MarkInvoiceFailedInput.fromJson(Map<String, dynamic> json) {
    try {
      return MarkInvoiceFailedInput(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        failedAt: DateTime.parse(json['failedAt'] as String),
        reason: json['reason'] as String?,
        attemptId: json['attemptId'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MarkInvoiceFailedInput: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final DateTime failedAt;

  final String? reason;

  final String? attemptId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'failedAt': failedAt.toUtc().toIso8601String(),
    'reason': ?reason,
    'attemptId': ?attemptId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MarkInvoiceFailedInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkInvoiceFailedInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(failedAt, other.failedAt) &&
          contractEquals(reason, other.reason) &&
          contractEquals(attemptId, other.attemptId);

  @override
  int get hashCode =>
      contractHash([tenantId, invoiceId, failedAt, reason, attemptId]);
}

/// Invoice status after the operation.
@immutable
final class InvoiceStateResult {
  const InvoiceStateResult({required this.invoiceId, required this.status});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceStateResult.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceStateResult(
        invoiceId: json['invoiceId'] as String,
        status: decodeEnum(
          json['status'],
          InvoiceStatus.tryParse,
          'InvoiceStatus',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceStateResult: $error', json);
    }
  }

  final String invoiceId;

  final InvoiceStatus status;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'invoiceId': invoiceId,
    'status': status.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceStateResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceStateResult &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(status, other.status);

  @override
  int get hashCode => contractHash([invoiceId, status]);
}

/// Invoice with its issue and payment dates, to sync another service.
@immutable
final class InvoiceChange {
  const InvoiceChange({
    required this.id,
    required this.number,
    required this.period,
    required this.status,
    required this.currency,
    required this.total,
    required this.issuedAt,
    required this.paidAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceChange.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceChange(
        id: json['id'] as String,
        number: json['number'] as String,
        period: BillingPeriod.fromJson(json['period'] as Map<String, dynamic>),
        status: decodeEnum(
          json['status'],
          InvoiceStatus.tryParse,
          'InvoiceStatus',
        ),
        currency: decodeEnum(json['currency'], Currency.tryParse, 'Currency'),
        total: MoneyAmount.fromJson(json['total'] as Map<String, dynamic>),
        issuedAt: DateTime.parse(json['issuedAt'] as String),
        paidAt: json['paidAt'] == null
            ? null
            : DateTime.parse(json['paidAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceChange: $error', json);
    }
  }

  final String id;

  final String number;

  final BillingPeriod period;

  final InvoiceStatus status;

  final Currency currency;

  final MoneyAmount total;

  final DateTime issuedAt;

  final DateTime? paidAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'number': number,
    'period': period.toJson(),
    'status': status.wireCode,
    'currency': currency.wireCode,
    'total': total.toJson(),
    'issuedAt': issuedAt.toUtc().toIso8601String(),
    'paidAt': switch (paidAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceChange value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceChange &&
          contractEquals(id, other.id) &&
          contractEquals(number, other.number) &&
          contractEquals(period, other.period) &&
          contractEquals(status, other.status) &&
          contractEquals(currency, other.currency) &&
          contractEquals(total, other.total) &&
          contractEquals(issuedAt, other.issuedAt) &&
          contractEquals(paidAt, other.paidAt);

  @override
  int get hashCode => contractHash([
    id,
    number,
    period,
    status,
    currency,
    total,
    issuedAt,
    paidAt,
  ]);
}

/// Page of a tenant invoices, newest first.
@immutable
final class InvoiceChangePage {
  const InvoiceChangePage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvoiceChangePage.fromJson(Map<String, dynamic> json) {
    try {
      return InvoiceChangePage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            InvoiceChange.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvoiceChangePage: $error', json);
    }
  }

  final List<InvoiceChange> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvoiceChangePage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceChangePage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Input to page the invoices of a tenant.
@immutable
final class ListInvoiceChangesInput {
  const ListInvoiceChangesInput({
    required this.tenantId,
    this.limit,
    this.after,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListInvoiceChangesInput.fromJson(Map<String, dynamic> json) {
    try {
      return ListInvoiceChangesInput(
        tenantId: json['tenantId'] as String,
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListInvoiceChangesInput: $error', json);
    }
  }

  final String tenantId;

  final int? limit;

  final String? after;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListInvoiceChangesInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListInvoiceChangesInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([tenantId, limit, after]);
}
