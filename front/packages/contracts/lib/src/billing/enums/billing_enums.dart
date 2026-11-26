// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Status of a subscription.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum SubscriptionStatus {
  trialing('trialing'),
  active('active'),
  pastDue('past_due'),
  suspended('suspended'),
  canceled('canceled');

  const SubscriptionStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static SubscriptionStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of an invoice.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum InvoiceStatus {
  draft('draft'),
  issued('issued'),
  paid('paid'),
  failed('failed'),
  voidValue('void');

  const InvoiceStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static InvoiceStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Type of an invoice line.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum InvoiceLineKind {
  fixedFee('fixed_fee'),
  usage('usage');

  const InvoiceLineKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static InvoiceLineKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Billing interval of a plan.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum PlanPeriodicity {
  monthly('monthly'),
  annual('annual');

  const PlanPeriodicity(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static PlanPeriodicity? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Currency of the invoice.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum Currency {
  cop('COP'),
  usd('USD');

  const Currency(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static Currency? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Usage metric that has a quota.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum UsageMetric {
  users('users'),
  apiCalls('api_calls'),
  storageGb('storage_gb');

  const UsageMetric(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static UsageMetric? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `UsageAggregationKind` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum UsageAggregationKind {
  max('max'),
  sum('sum');

  const UsageAggregationKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static UsageAggregationKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Public error codes of the `billing` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum BillingErrorCode {
  /// The tenant has no subscription.
  subscriptionNotFound(
    'BILLING.SUBSCRIPTION.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_subscription_not_found',
  ),

  /// The subscription is suspended or cancelled and does not allow a plan change.
  subscriptionNotChangeable(
    'BILLING.SUBSCRIPTION.NOT_CHANGEABLE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_subscription_not_changeable',
  ),

  /// The plan does not exist or is not available for this tenant.
  planNotAvailable(
    'BILLING.PLAN.NOT_AVAILABLE',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_plan_not_available',
  ),

  /// Current usage exceeds a limit of the new plan: cannot downgrade to that plan.
  planUsageExceedsLimit(
    'BILLING.PLAN.USAGE_EXCEEDS_LIMIT',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_plan_usage_exceeds_limit',
  ),

  /// The invoice does not exist in the tenant.
  invoiceNotFound(
    'BILLING.INVOICE.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_billing_invoice_not_found',
  ),

  /// The invoice is not in a state that allows the requested operation.
  invoiceInvalidState(
    'BILLING.INVOICE.INVALID_STATE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_billing_invoice_invalid_state',
  ),

  /// The amount paid does not match the invoice total in its currency. The details carry expected and received.
  invoiceAmountMismatch(
    'BILLING.INVOICE.AMOUNT_MISMATCH',
    httpStatus: 422,
    retryable: false,
    messageKey: 'error_billing_invoice_amount_mismatch',
  ),

  /// The plan quota was reached. The details carry metric, limit and used.
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

  /// Exact code sent by the backend, for example `BILLING.SUBSCRIPTION.NOT_FOUND`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static BillingErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static BillingErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `BillingRoute` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum BillingRoute {
  getSubscription('billing.subscription.get'),
  getUsage('billing.usage.get'),
  listPlans('billing.plan.list'),
  changePlan('billing.subscription.change-plan'),
  listInvoices('billing.invoice.list'),
  getInvoice('billing.invoice.get');

  const BillingRoute(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingOperation` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
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
  tenantMoveCleanup('billing.tenant-move.cleanup.v1'),
  tenantDirectoryPlace('billing.tenant-directory.place.v1'),
  tenantDirectoryRemove('billing.tenant-directory.remove.v1');

  const BillingOperation(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingEvent` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum BillingEvent {
  subscriptionChanged('billing.subscription.changed.v1'),
  subscriptionSuspended('billing.subscription.suspended.v1'),
  subscriptionReactivated('billing.subscription.reactivated.v1'),
  entitlementsChanged('billing.entitlements.changed.v1'),
  invoiceIssued('billing.invoice.issued.v1'),
  invoicePaid('billing.invoice.paid.v1'),
  invoiceFailed('billing.invoice.failed.v1');

  const BillingEvent(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingCommand` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum BillingCommand {
  recordUsage('billing.usage.record.v1');

  const BillingCommand(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingCommand? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingTopic` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum BillingTopic {
  events('billing-events');

  const BillingTopic(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `BillingQueue` of the `billing` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum BillingQueue {
  usage('billing-usage'),
  identity('billing-identity');

  const BillingQueue(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static BillingQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
