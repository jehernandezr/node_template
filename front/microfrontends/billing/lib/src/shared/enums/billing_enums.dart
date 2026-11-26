/// Enums of the billing microfrontend. The ones the API also speaks come from
/// the billing contract, so the demo and the API repositories share them.
library;

export 'package:contracts/contracts.dart'
    show
        Currency,
        InvoiceLineKind,
        InvoiceStatus,
        PlanPeriodicity,
        SubscriptionStatus,
        UsageMetric;

/// Severity of a usage meter.
enum UsageLevel {
  /// Well below the limit.
  normal,

  /// Close to the limit.
  warning,

  /// At or over the limit.
  danger,
}

/// Operations of the billing repository. The demo repository tags each call
/// with one so a test can make a single operation fail.
enum BillingOperation {
  /// Loading the subscription.
  currentSubscription,

  /// Loading the usage.
  currentUsage,

  /// Listing the plans.
  availablePlans,

  /// Changing the plan.
  changePlan,

  /// Listing the invoices.
  invoices,

  /// Loading one invoice.
  invoice,
}

/// Meaning of a status chip. The chip maps each tone to colors of the theme.
enum StatusTone {
  /// A good outcome.
  success,

  /// Something needs attention.
  warning,

  /// Neutral information.
  info,

  /// A failure.
  danger,

  /// No meaning of its own.
  neutral,
}
