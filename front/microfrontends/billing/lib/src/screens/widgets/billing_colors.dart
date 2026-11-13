import 'package:flutter/painting.dart' show Color;

import '../../shared/enums/billing_enums.dart';

/// Warning tone used by usage meters and pending states. Material 3 has no
/// warning role, so it is fixed here.
const Color billingWarningColor = Color(0xFFB26A00);

/// Positive state, such as an active subscription or a paid invoice.
const Color billingSuccessColor = Color(0xFF2E7D32);

/// Informational state, such as an issued invoice or a trial.
const Color billingInfoColor = Color(0xFF1565C0);

/// Neutral state for drafts, canceled or voided documents.
const Color billingNeutralColor = Color(0xFF616161);

/// Negative state: suspended subscriptions and failed invoices.
const Color billingDangerColor = Color(0xFFC62828);

/// Chip color for a subscription status.
Color subscriptionStatusColor(SubscriptionStatus status) => switch (status) {
  SubscriptionStatus.trialing => billingInfoColor,
  SubscriptionStatus.active => billingSuccessColor,
  SubscriptionStatus.pastDue => billingWarningColor,
  SubscriptionStatus.suspended => billingDangerColor,
  SubscriptionStatus.canceled => billingNeutralColor,
};

/// Chip color for an invoice status.
Color invoiceStatusColor(InvoiceStatus status) => switch (status) {
  InvoiceStatus.draft => billingNeutralColor,
  InvoiceStatus.issued => billingInfoColor,
  InvoiceStatus.paid => billingSuccessColor,
  InvoiceStatus.failed => billingDangerColor,
  InvoiceStatus.voided => billingNeutralColor,
};
