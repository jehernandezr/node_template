// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../billing/schemas/billing_schemas.dart';
import '../../billing/types/billing_types.dart';
import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';

/// Eventos que publica el contrato `billing`.
abstract final class BillingEvents {
  /// Cambió el plan de la suscripción de un tenant.
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

  /// Se suspendió la suscripción de un tenant. Identity suspende el acceso.
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

  /// Se reactivó la suscripción de un tenant.
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

  /// Cambiaron las funcionalidades y cuotas vigentes de un tenant. Identity las refleja en los permisos.
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

  /// Se emitió una factura.
  ///
  /// `billing.invoice.issued.v1`
  static const invoiceIssued = MessageDescriptor<InvoiceIssuedPayload>(
    type: 'billing.invoice.issued.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoiceIssuedPayloadSchema.validateIncoming,
    decodePayload: InvoiceIssuedPayload.fromJson,
  );

  /// Se pagó una factura.
  ///
  /// `billing.invoice.paid.v1`
  static const invoicePaid = MessageDescriptor<InvoicePaidPayload>(
    type: 'billing.invoice.paid.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoicePaidPayloadSchema.validateIncoming,
    decodePayload: InvoicePaidPayload.fromJson,
  );

  /// Falló el cobro de una factura.
  ///
  /// `billing.invoice.failed.v1`
  static const invoiceFailed = MessageDescriptor<InvoiceFailedPayload>(
    type: 'billing.invoice.failed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: InvoiceFailedPayloadSchema.validateIncoming,
    decodePayload: InvoiceFailedPayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[
    subscriptionChanged,
    subscriptionSuspended,
    subscriptionReactivated,
    entitlementsChanged,
    invoiceIssued,
    invoicePaid,
    invoiceFailed,
  ];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}

/// Comandos que atiende el contrato `billing`.
abstract final class BillingCommands {
  /// Registra el uso de un tenant medido por otro servicio. Cada registro lleva su llave de idempotencia.
  ///
  /// `billing.usage.record.v1`
  static const recordUsage = MessageDescriptor<RecordUsagePayload>(
    type: 'billing.usage.record.v1',
    kind: MessageKind.command,
    version: 1,
    validatePayload: RecordUsagePayloadSchema.validateIncoming,
    decodePayload: RecordUsagePayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[recordUsage];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
