/// Enums of the billing microfrontend. They import nothing.
///
/// The backend has no billing contract yet, so there is no generated
/// equivalent in `package:contracts`. Replace these when it appears.
library;

/// Currencies the billing service invoices in.
///
/// Amounts are `MoneyAmount` of the contract, whose `currency` is [code]; the
/// decimals and the symbol come from the locale (`utils.formatMoney`).
enum Currency {
  /// Colombian peso.
  cop('COP'),

  /// US dollar.
  usd('USD');

  const Currency(this.code);

  /// ISO 4217 code.
  final String code;
}

/// Metered limits a plan can include. The label of each one lives in the ARB
/// (`quotaLabel`), not in the data.
enum QuotaKey {
  users('users'),
  apiCalls('api_calls'),
  storageGb('storage_gb');

  const QuotaKey(this.code);

  /// Stable code used by the billing service.
  final String code;
}

/// How often a plan is charged.
enum PlanPeriodicity { monthly, annual }

/// Lifecycle state of a subscription.
enum SubscriptionStatus { trialing, active, pastDue, suspended, canceled }

/// Lifecycle state of an invoice. The payment itself happens outside billing.
enum InvoiceStatus { draft, issued, paid, failed, voided }

/// Kind of invoice line: the fixed plan charge or metered usage.
enum InvoiceLineKind { fixedFee, usage }

/// Severity of a usage meter.
enum UsageLevel { normal, warning, danger }
