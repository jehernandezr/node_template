import '../enums/billing_enums.dart';

/// Tone of the chip of each subscription and invoice status.
abstract final class BillingTones {
  /// Tone for a subscription [status].
  static StatusTone subscription(SubscriptionStatus status) => switch (status) {
    SubscriptionStatus.trialing => StatusTone.info,
    SubscriptionStatus.active => StatusTone.success,
    SubscriptionStatus.pastDue => StatusTone.warning,
    SubscriptionStatus.suspended => StatusTone.danger,
    SubscriptionStatus.canceled => StatusTone.neutral,
  };

  /// Tone for an invoice [status].
  static StatusTone invoice(InvoiceStatus status) => switch (status) {
    InvoiceStatus.draft => StatusTone.neutral,
    InvoiceStatus.issued => StatusTone.info,
    InvoiceStatus.paid => StatusTone.success,
    InvoiceStatus.failed => StatusTone.danger,
    InvoiceStatus.voided => StatusTone.neutral,
  };
}
