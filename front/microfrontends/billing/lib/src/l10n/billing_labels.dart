import 'package:material_ui/material_ui.dart';
import 'package:utils/utils.dart' show formatDate;

import '../shared/enums/billing_enums.dart';
import '../shared/types/billing_types.dart';
import 'generated/billing_localizations.dart';

/// Etiqueta BCP 47 del locale de [context], para los formatos de `utils`.
String localeTag(BuildContext context) =>
    Localizations.localeOf(context).toLanguageTag();

/// Localized name of a metered limit.
String quotaLabel(BillingLocalizations l10n, QuotaKey key) => switch (key) {
  QuotaKey.users => l10n.quotaUsers,
  QuotaKey.apiCalls => l10n.quotaApiCalls,
  QuotaKey.storageGb => l10n.quotaStorageGb,
};

/// Formats a period with the localized range text and the dates of [locale],
/// for example `1 nov 2026 a 30 nov 2026`.
String formatPeriod(
  BillingLocalizations l10n,
  BillingPeriod period, {
  required String locale,
}) => l10n.periodRange(
  formatDate(period.start, locale: locale),
  formatDate(period.end, locale: locale),
);

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
