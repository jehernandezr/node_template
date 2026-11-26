// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../billing/schemas/billing_schemas.dart';
import '../../billing/types/billing_types.dart';
import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';

/// Events published by the `billing` contract.
abstract final class BillingEvents {
  /// The plan of a tenant subscription changed.
  ///
  /// `billing.subscription.changed.v1`
  static const subscriptionChanged =
      MessageDescriptor<SubscriptionChangedPayload>(
        type: 'billing.subscription.changed.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: SubscriptionChangedPayloadSchema.validateIncoming,
        decodePayload: SubscriptionChangedPayload.fromJson,
      );

  /// A tenant subscription was suspended. Identity suspends access.
  ///
  /// `billing.subscription.suspended.v1`
  static const subscriptionSuspended =
      MessageDescriptor<SubscriptionSuspendedPayload>(
        type: 'billing.subscription.suspended.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: SubscriptionSuspendedPayloadSchema.validateIncoming,
        decodePayload: SubscriptionSuspendedPayload.fromJson,
      );

  /// A tenant subscription was reactivated.
  ///
  /// `billing.subscription.reactivated.v1`
  static const subscriptionReactivated =
      MessageDescriptor<SubscriptionReactivatedPayload>(
        type: 'billing.subscription.reactivated.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: SubscriptionReactivatedPayloadSchema.validateIncoming,
        decodePayload: SubscriptionReactivatedPayload.fromJson,
      );

  /// The active features and quotas of a tenant changed. Identity reflects them in the permissions.
  ///
  /// `billing.entitlements.changed.v1`
  static const entitlementsChanged =
      MessageDescriptor<EntitlementsChangedPayload>(
        type: 'billing.entitlements.changed.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: EntitlementsChangedPayloadSchema.validateIncoming,
        decodePayload: EntitlementsChangedPayload.fromJson,
      );

  /// An invoice was issued.
  ///
  /// `billing.invoice.issued.v1`
  static const invoiceIssued = MessageDescriptor<InvoiceIssuedPayload>(
    type: 'billing.invoice.issued.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoiceIssuedPayloadSchema.validateIncoming,
    decodePayload: InvoiceIssuedPayload.fromJson,
  );

  /// An invoice was paid.
  ///
  /// `billing.invoice.paid.v1`
  static const invoicePaid = MessageDescriptor<InvoicePaidPayload>(
    type: 'billing.invoice.paid.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoicePaidPayloadSchema.validateIncoming,
    decodePayload: InvoicePaidPayload.fromJson,
  );

  /// Charging an invoice failed.
  ///
  /// `billing.invoice.failed.v1`
  static const invoiceFailed = MessageDescriptor<InvoiceFailedPayload>(
    type: 'billing.invoice.failed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoiceFailedPayloadSchema.validateIncoming,
    decodePayload: InvoiceFailedPayload.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[
    subscriptionChanged,
    subscriptionSuspended,
    subscriptionReactivated,
    entitlementsChanged,
    invoiceIssued,
    invoicePaid,
    invoiceFailed,
  ];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}

/// Commands handled by the `billing` contract.
abstract final class BillingCommands {
  /// Records the usage of a tenant metered by another service. Each record carries its idempotency key.
  ///
  /// `billing.usage.record.v1`
  static const recordUsage = MessageDescriptor<RecordUsagePayload>(
    type: 'billing.usage.record.v1',
    kind: MessageKind.command,
    version: 1,
    validatePayload: RecordUsagePayloadSchema.validateIncoming,
    decodePayload: RecordUsagePayload.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[recordUsage];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
