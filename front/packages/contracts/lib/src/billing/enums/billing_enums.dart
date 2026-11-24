// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Estado de una suscripción.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum SubscriptionStatus {
  trialing('trialing'),
  active('active'),
  pastDue('past_due'),
  suspended('suspended'),
  canceled('canceled');

  const SubscriptionStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static SubscriptionStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una factura.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum InvoiceStatus {
  draft('draft'),
  issued('issued'),
  paid('paid'),
  failed('failed'),
  voidValue('void');

  const InvoiceStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static InvoiceStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Tipo de línea de una factura.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum InvoiceLineKind {
  fixedFee('fixed_fee'),
  usage('usage');

  const InvoiceLineKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static InvoiceLineKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Periodicidad de cobro de un plan.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum PlanPeriodicity {
  monthly('monthly'),
  annual('annual');

  const PlanPeriodicity(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static PlanPeriodicity? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Moneda en que se factura.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum Currency {
  cop('COP'),
  usd('USD');

  const Currency(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static Currency? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Métrica de uso que tiene cuota.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum UsageMetric {
  users('users'),
  apiCalls('api_calls'),
  storageGb('storage_gb');

  const UsageMetric(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static UsageMetric? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `UsageAggregationKind` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum UsageAggregationKind {
  max('max'),
  sum('sum');

  const UsageAggregationKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static UsageAggregationKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Códigos de error públicos del contrato `billing`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum BillingErrorCode {
  /// El tenant no tiene una suscripción.
  subscriptionNotFound(
    'BILLING.SUBSCRIPTION.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_subscription_not_found',
  ),

  /// La suscripción está suspendida o cancelada y no admite cambio de plan.
  subscriptionNotChangeable(
    'BILLING.SUBSCRIPTION.NOT_CHANGEABLE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_subscription_not_changeable',
  ),

  /// El plan no existe o no está disponible para este tenant.
  planNotAvailable(
    'BILLING.PLAN.NOT_AVAILABLE',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_plan_not_available',
  ),

  /// El uso actual supera un límite del plan nuevo: no se puede bajar a ese plan.
  planUsageExceedsLimit(
    'BILLING.PLAN.USAGE_EXCEEDS_LIMIT',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_plan_usage_exceeds_limit',
  ),

  /// La factura no existe en el tenant.
  invoiceNotFound(
    'BILLING.INVOICE.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_invoice_not_found',
  ),

  /// La factura no está en un estado que admita la operación pedida.
  invoiceInvalidState(
    'BILLING.INVOICE.INVALID_STATE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_invoice_invalid_state',
  ),

  /// Se alcanzó la cuota del plan. Los detalles traen metric, limit y used.
  quotaExceeded(
    'BILLING.QUOTA.EXCEEDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_billing_quota_exceeded',
  );

  const BillingErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Código exacto que envía el backend, por ejemplo `BILLING.SUBSCRIPTION.NOT_FOUND`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static BillingErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static BillingErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `BillingRoute` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingRoute {
  getSubscription('billing.subscription.get'),
  getUsage('billing.usage.get'),
  listPlans('billing.plan.list'),
  changePlan('billing.subscription.change-plan'),
  listInvoices('billing.invoice.list'),
  getInvoice('billing.invoice.get');

  const BillingRoute(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingOperation` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingOperation {
  openAccount('billing.accounts.open.v1'),
  closeAccount('billing.accounts.close.v1'),
  getEntitlements('billing.entitlements.get.v1'),
  checkQuota('billing.quotas.check.v1'),
  markInvoicePaid('billing.invoices.mark-paid.v1'),
  markInvoiceFailed('billing.invoices.mark-failed.v1'),
  listInvoiceChanges('billing.invoices.list-changes.v1'),
  tenantMoveSync('billing.tenant-move.sync.v1'),
  tenantMoveFinalize('billing.tenant-move.finalize.v1'),
  tenantMoveAbort('billing.tenant-move.abort.v1'),
  tenantMoveSwitch('billing.tenant-move.switch.v1'),
  tenantMoveCleanup('billing.tenant-move.cleanup.v1');

  const BillingOperation(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingEvent` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingEvent {
  subscriptionChanged('billing.subscription.changed.v1'),
  subscriptionSuspended('billing.subscription.suspended.v1'),
  subscriptionReactivated('billing.subscription.reactivated.v1'),
  entitlementsChanged('billing.entitlements.changed.v1'),
  invoiceIssued('billing.invoice.issued.v1'),
  invoicePaid('billing.invoice.paid.v1'),
  invoiceFailed('billing.invoice.failed.v1');

  const BillingEvent(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingCommand` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingCommand {
  recordUsage('billing.usage.record.v1');

  const BillingCommand(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingCommand? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingTopic` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingTopic {
  events('billing-events');

  const BillingTopic(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingQueue` del contrato `billing`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum BillingQueue {
  usage('billing-usage'),
  identity('billing-identity');

  const BillingQueue(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static BillingQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
