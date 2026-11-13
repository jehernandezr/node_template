/// Enums of the billing microfrontend. They import nothing.
///
/// The backend has no billing contract yet, so there is no generated
/// equivalent in `package:contracts`. Replace these when it appears.
library;

/// Currencies the billing service invoices in.
enum Currency {
  /// Colombian peso. No decimals: one minor unit is one peso.
  cop('COP', r'$', 0),

  /// US dollar. Two decimals: one minor unit is one cent.
  usd('USD', r'US$', 2);

  const Currency(this.code, this.symbol, this.minorUnitDigits);

  /// ISO 4217 code.
  final String code;

  /// Symbol shown before the amount.
  final String symbol;

  /// Number of decimal digits in the minor unit.
  final int minorUnitDigits;
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
