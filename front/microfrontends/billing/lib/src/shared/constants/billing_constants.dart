/// Constants of the billing microfrontend. They import only enums.
library;

/// Share of a quota limit, in percent, from which a meter shows a warning.
const int usageWarningPercent = 80;

/// Share of a quota limit, in percent, from which a meter shows danger.
const int usageDangerPercent = 100;

/// Minimum height of the change-plan sheet while it loads, so it does not
/// jump when the plans arrive.
const double billingSheetMinHeight = 160;

/// Invoices the list shows: the largest page the contract allows.
const int billingInvoicesPageSize = 100;
