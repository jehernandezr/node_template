// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../billing/enums/billing_enums.dart';
import '../../core/core.dart';
import '../../identity/enums/identity_enums.dart';
import '../../platform/types/platform_types.dart';

/// Periodo de facturación con fechas de calendario.
@immutable
final class BillingPeriod {
  const BillingPeriod({required this.start, required this.end});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'start': start,
    'end': end,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Límite de una métrica en un plan.
@immutable
final class QuotaLimit {
  const QuotaLimit({required this.metric, required this.limit});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Uso de una métrica en una ventana, con su llave de idempotencia.
@immutable
final class UsageRecord {
  const UsageRecord({
    required this.metric,
    required this.quantity,
    required this.windowStart,
    required this.key,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'quantity': quantity,
    'windowStart': windowStart.toUtc().toIso8601String(),
    'key': key,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Lote de registros de uso de un tenant.
@immutable
final class RecordUsagePayload {
  const RecordUsagePayload({required this.tenantId, required this.records});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'records': [for (final e0 in records) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Cambió el plan de una suscripción.
@immutable
final class SubscriptionChangedPayload {
  const SubscriptionChangedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.previousPlanId,
    required this.planId,
    required this.changedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'previousPlanId': previousPlanId,
    'planId': planId,
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Se suspendió una suscripción por falta de pago.
@immutable
final class SubscriptionSuspendedPayload {
  const SubscriptionSuspendedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.suspendedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'suspendedAt': suspendedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Se reactivó una suscripción suspendida.
@immutable
final class SubscriptionReactivatedPayload {
  const SubscriptionReactivatedPayload({
    required this.tenantId,
    required this.subscriptionId,
    required this.reactivatedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'reactivatedAt': reactivatedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Cambiaron las funcionalidades o cuotas vigentes de un tenant.
@immutable
final class EntitlementsChangedPayload {
  const EntitlementsChangedPayload({
    required this.tenantId,
    required this.features,
    required this.quotas,
    required this.changedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'features': [for (final e0 in features) e0.wireCode],
    'quotas': [for (final e0 in quotas) e0.toJson()],
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Se emitió una factura.
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

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'period': period.toJson(),
    'total': total.toJson(),
    'issuedAt': issuedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Se pagó una factura.
@immutable
final class InvoicePaidPayload {
  const InvoicePaidPayload({
    required this.tenantId,
    required this.invoiceId,
    required this.number,
    required this.total,
    required this.paidAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'total': total.toJson(),
    'paidAt': paidAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Falló el cobro de una factura.
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

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'number': number,
    'total': total.toJson(),
    'attempts': attempts,
    'failedAt': failedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Plan del catálogo con su precio y sus límites.
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

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'price': price.toJson(),
    'periodicity': periodicity.wireCode,
    'quotas': [for (final e0 in quotas) e0.toJson()],
    'features': [for (final e0 in features) e0.wireCode],
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Catálogo de planes disponibles.
@immutable
final class PlanCatalog {
  const PlanCatalog({required this.items});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(PlanCatalog value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanCatalog && contractEquals(items, other.items);

  @override
  int get hashCode => contractHash([items]);
}

/// Suscripción del tenant con su plan y el periodo vigente.
@immutable
final class Subscription {
  const Subscription({
    required this.id,
    required this.plan,
    required this.status,
    required this.period,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'plan': plan.toJson(),
    'status': status.wireCode,
    'period': period.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Uso de una métrica frente a su límite.
@immutable
final class QuotaUsage {
  const QuotaUsage({
    required this.metric,
    required this.limit,
    required this.used,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
    'used': used,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Uso del periodo vigente de cada métrica con cuota.
@immutable
final class UsageOverview {
  const UsageOverview({required this.items});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(UsageOverview value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UsageOverview && contractEquals(items, other.items);

  @override
  int get hashCode => contractHash([items]);
}

/// Línea de una factura.
@immutable
final class InvoiceLine {
  const InvoiceLine({
    required this.kind,
    required this.description,
    required this.amount,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'kind': kind.wireCode,
    'description': description,
    'amount': amount.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Factura completa con sus líneas.
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

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'number': number,
    'period': period.toJson(),
    'status': status.wireCode,
    'currency': currency.wireCode,
    'lines': [for (final e0 in lines) e0.toJson()],
    'total': total.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Factura sin líneas, para listados.
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

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'number': number,
    'period': period.toJson(),
    'status': status.wireCode,
    'currency': currency.wireCode,
    'total': total.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Página de facturas, más nuevas primero.
@immutable
final class InvoicePage {
  const InvoicePage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Plan al que cambia la suscripción.
@immutable
final class ChangePlanRequest {
  const ChangePlanRequest({required this.planId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory ChangePlanRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ChangePlanRequest(planId: json['planId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid ChangePlanRequest: $error', json);
    }
  }

  final String planId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'planId': planId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(ChangePlanRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChangePlanRequest && contractEquals(planId, other.planId);

  @override
  int get hashCode => contractHash([planId]);
}

/// Filtros y paginación del listado de facturas.
@immutable
final class ListInvoicesRequest {
  const ListInvoicesRequest({this.status, this.limit, this.after});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    if (status case final value?) 'status': value.wireCode,
    'limit': ?limit,
    'after': ?after,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Factura a consultar.
@immutable
final class GetInvoiceRequest {
  const GetInvoiceRequest({required this.invoiceId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory GetInvoiceRequest.fromJson(Map<String, dynamic> json) {
    try {
      return GetInvoiceRequest(invoiceId: json['invoiceId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetInvoiceRequest: $error', json);
    }
  }

  final String invoiceId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'invoiceId': invoiceId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(GetInvoiceRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetInvoiceRequest && contractEquals(invoiceId, other.invoiceId);

  @override
  int get hashCode => contractHash([invoiceId]);
}

/// Abre la cuenta de facturación de un tenant nuevo.
@immutable
final class OpenBillingAccountInput {
  const OpenBillingAccountInput({
    required this.tenantId,
    required this.ownerUserId,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'ownerUserId': ownerUserId,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Cuenta de facturación abierta con su suscripción.
@immutable
final class BillingAccountResult {
  const BillingAccountResult({
    required this.tenantId,
    required this.subscriptionId,
    required this.status,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'subscriptionId': subscriptionId,
    'status': status.wireCode,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Cierra la cuenta de facturación de un tenant.
@immutable
final class CloseBillingAccountInput {
  const CloseBillingAccountInput({required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory CloseBillingAccountInput.fromJson(Map<String, dynamic> json) {
    try {
      return CloseBillingAccountInput(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid CloseBillingAccountInput: $error', json);
    }
  }

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Cuenta de facturación cerrada.
@immutable
final class BillingAccountClosed {
  const BillingAccountClosed({required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory BillingAccountClosed.fromJson(Map<String, dynamic> json) {
    try {
      return BillingAccountClosed(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid BillingAccountClosed: $error', json);
    }
  }

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(BillingAccountClosed value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BillingAccountClosed && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Tenant cuyas funcionalidades y cuotas se consultan.
@immutable
final class GetEntitlementsInput {
  const GetEntitlementsInput({required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory GetEntitlementsInput.fromJson(Map<String, dynamic> json) {
    try {
      return GetEntitlementsInput(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetEntitlementsInput: $error', json);
    }
  }

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(GetEntitlementsInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetEntitlementsInput && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Funcionalidades y cuotas vigentes de un tenant.
@immutable
final class Entitlements {
  const Entitlements({
    required this.tenantId,
    required this.status,
    required this.features,
    required this.quotas,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'status': status.wireCode,
    'features': [for (final e0 in features) e0.wireCode],
    'quotas': [for (final e0 in quotas) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Consulta si un tenant puede consumir una cantidad de una métrica.
@immutable
final class CheckQuotaInput {
  const CheckQuotaInput({
    required this.tenantId,
    required this.metric,
    this.requested,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'metric': metric.wireCode,
    'requested': ?requested,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Resultado de consultar una cuota.
@immutable
final class QuotaCheck {
  const QuotaCheck({
    required this.metric,
    required this.limit,
    required this.used,
    required this.allowed,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'metric': metric.wireCode,
    'limit': limit,
    'used': used,
    'allowed': allowed,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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

/// Marca una factura como pagada con la referencia del proveedor.
@immutable
final class MarkInvoicePaidInput {
  const MarkInvoicePaidInput({
    required this.tenantId,
    required this.invoiceId,
    required this.paidAt,
    required this.reference,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MarkInvoicePaidInput.fromJson(Map<String, dynamic> json) {
    try {
      return MarkInvoicePaidInput(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        paidAt: DateTime.parse(json['paidAt'] as String),
        reference: json['reference'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MarkInvoicePaidInput: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final DateTime paidAt;

  final String reference;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'paidAt': paidAt.toUtc().toIso8601String(),
    'reference': reference,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MarkInvoicePaidInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkInvoicePaidInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(paidAt, other.paidAt) &&
          contractEquals(reference, other.reference);

  @override
  int get hashCode => contractHash([tenantId, invoiceId, paidAt, reference]);
}

/// Marca una factura como fallida después de un cobro rechazado.
@immutable
final class MarkInvoiceFailedInput {
  const MarkInvoiceFailedInput({
    required this.tenantId,
    required this.invoiceId,
    required this.failedAt,
    this.reason,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MarkInvoiceFailedInput.fromJson(Map<String, dynamic> json) {
    try {
      return MarkInvoiceFailedInput(
        tenantId: json['tenantId'] as String,
        invoiceId: json['invoiceId'] as String,
        failedAt: DateTime.parse(json['failedAt'] as String),
        reason: json['reason'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MarkInvoiceFailedInput: $error', json);
    }
  }

  final String tenantId;

  final String invoiceId;

  final DateTime failedAt;

  final String? reason;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'invoiceId': invoiceId,
    'failedAt': failedAt.toUtc().toIso8601String(),
    'reason': ?reason,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MarkInvoiceFailedInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkInvoiceFailedInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(invoiceId, other.invoiceId) &&
          contractEquals(failedAt, other.failedAt) &&
          contractEquals(reason, other.reason);

  @override
  int get hashCode => contractHash([tenantId, invoiceId, failedAt, reason]);
}

/// Estado de una factura después de la operación.
@immutable
final class InvoiceStateResult {
  const InvoiceStateResult({required this.invoiceId, required this.status});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
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

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'invoiceId': invoiceId,
    'status': status.wireCode,
  };

  /// Igual a [toJson], para usar como tear-off constante.
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
