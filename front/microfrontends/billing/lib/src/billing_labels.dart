import 'data/billing_models.dart';
import 'l10n/generated/billing_localizations.dart';

/// Localized label of a billing cadence.
String periodicityLabel(BillingLocalizations l10n, PlanPeriodicity value) =>
    switch (value) {
      PlanPeriodicity.monthly => l10n.monthly,
      PlanPeriodicity.annual => l10n.annual,
    };

/// Localized label of a subscription status.
String subscriptionStatusLabel(
  BillingLocalizations l10n,
  SubscriptionStatus value,
) => switch (value) {
  SubscriptionStatus.trialing => l10n.subscriptionTrialing,
  SubscriptionStatus.active => l10n.subscriptionActive,
  SubscriptionStatus.pastDue => l10n.subscriptionPastDue,
  SubscriptionStatus.suspended => l10n.subscriptionSuspended,
  SubscriptionStatus.canceled => l10n.subscriptionCanceled,
};

/// Localized label of an invoice status.
String invoiceStatusLabel(BillingLocalizations l10n, InvoiceStatus value) =>
    switch (value) {
      InvoiceStatus.draft => l10n.invoiceDraft,
      InvoiceStatus.issued => l10n.invoiceIssued,
      InvoiceStatus.paid => l10n.invoicePaid,
      InvoiceStatus.failed => l10n.invoiceFailed,
      InvoiceStatus.voided => l10n.invoiceVoided,
    };

/// Localized label of an invoice line kind.
String invoiceLineKindLabel(BillingLocalizations l10n, InvoiceLineKind value) =>
    switch (value) {
      InvoiceLineKind.fixedFee => l10n.fixedFee,
      InvoiceLineKind.usage => l10n.usageCharge,
    };
