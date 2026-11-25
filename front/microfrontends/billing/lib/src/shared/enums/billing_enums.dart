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
enum UsageLevel { normal, warning, danger }

/// Operations of the billing repository. The demo repository tags each call
/// with one so a test can make a single operation fail.
enum BillingOperation {
  currentSubscription,
  currentUsage,
  availablePlans,
  changePlan,
  invoices,
  invoice,
}

/// Meaning of a status chip. The chip maps each tone to colors of the theme.
enum StatusTone { success, warning, info, danger, neutral }
