import { Compensation, defineOperation } from '@contracts/platform';
import {
  BillingErrorCode,
  BillingOperation,
} from '../enums/identifiers.enum.js';
import {
  BillingAccountClosedSchema,
  BillingAccountResultSchema,
  CheckQuotaInputSchema,
  CloseBillingAccountInputSchema,
  EntitlementsSchema,
  GetEntitlementsInputSchema,
  InvoiceChangePageSchema,
  InvoiceStateResultSchema,
  ListInvoiceChangesInputSchema,
  MarkInvoiceFailedInputSchema,
  MarkInvoicePaidInputSchema,
  OpenBillingAccountInputSchema,
  QuotaCheckSchema,
} from '../schemas/billing.schema.js';

/**
 * Abre la cuenta de facturación de un tenant nuevo. Su reversa es cerrar la
 * cuenta, así la saga no deja una suscripción huérfana.
 */
export const OpenAccountOperation = defineOperation({
  id: BillingOperation.OpenAccount,
  input: OpenBillingAccountInputSchema,
  output: BillingAccountResultSchema,
  idempotent: true,
  compensatedBy: BillingOperation.CloseAccount,
  errors: [BillingErrorCode.PlanNotAvailable],
  timeoutMs: 5000,
  description: 'Abre la cuenta de facturación de un tenant con su suscripción.',
});

/**
 * Cierra la cuenta de facturación. Solo corre como compensación de la apertura:
 * sin factura emitida borra la suscripción y no hay nada que restaurar.
 */
export const CloseAccountOperation = defineOperation({
  id: BillingOperation.CloseAccount,
  input: CloseBillingAccountInputSchema,
  output: BillingAccountClosedSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Solo corre como compensación de la apertura: sin factura emitida borra la suscripción y no hay nada que restaurar.',
  errors: [BillingErrorCode.InvoiceInvalidState],
  timeoutMs: 5000,
  description: 'Cierra la cuenta de facturación de un tenant.',
});

/** Lee las funcionalidades y cuotas vigentes de un tenant. */
export const GetEntitlementsOperation = defineOperation({
  id: BillingOperation.GetEntitlements,
  input: GetEntitlementsInputSchema,
  output: EntitlementsSchema,
  idempotent: true,
  mutating: false,
  errors: [BillingErrorCode.SubscriptionNotFound],
  timeoutMs: 5000,
  description: 'Consulta las funcionalidades y cuotas vigentes de un tenant.',
});

/** Consulta si un tenant puede consumir una cantidad de una métrica. */
export const CheckQuotaOperation = defineOperation({
  id: BillingOperation.CheckQuota,
  input: CheckQuotaInputSchema,
  output: QuotaCheckSchema,
  idempotent: true,
  mutating: false,
  errors: [BillingErrorCode.SubscriptionNotFound],
  timeoutMs: 1000,
  description:
    'Consulta si un tenant puede consumir una cantidad de una métrica.',
});

/**
 * Marca una factura como pagada. El pago ocurrió fuera de billing; un error se
 * corrige con una nota, no con una reversa.
 */
export const MarkInvoicePaidOperation = defineOperation({
  id: BillingOperation.MarkInvoicePaid,
  input: MarkInvoicePaidInputSchema,
  output: InvoiceStateResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'El pago ocurrió fuera de billing; un error se corrige con una nota, no con una reversa.',
  errors: [
    BillingErrorCode.InvoiceNotFound,
    BillingErrorCode.InvoiceInvalidState,
    BillingErrorCode.InvoiceAmountMismatch,
  ],
  timeoutMs: 5000,
  description:
    'Marca una factura como pagada con la referencia del proveedor y el monto cobrado, que debe ser su total.',
});

/**
 * Marca una factura como fallida. El cobro falló fuera de billing; un error se
 * corrige con una nota, no con una reversa.
 */
export const MarkInvoiceFailedOperation = defineOperation({
  id: BillingOperation.MarkInvoiceFailed,
  input: MarkInvoiceFailedInputSchema,
  output: InvoiceStateResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'El cobro falló fuera de billing; un error se corrige con una nota, no con una reversa.',
  errors: [
    BillingErrorCode.InvoiceNotFound,
    BillingErrorCode.InvoiceInvalidState,
  ],
  timeoutMs: 5000,
  description: 'Marca una factura como fallida después de un cobro rechazado.',
});

/** Pagina las facturas de un tenant, de la más nueva a la más vieja, para que otro servicio rellene su copia. */
export const ListInvoiceChangesOperation = defineOperation({
  id: BillingOperation.ListInvoiceChanges,
  input: ListInvoiceChangesInputSchema,
  output: InvoiceChangePageSchema,
  idempotent: true,
  mutating: false,
  timeoutMs: 5000,
  description:
    'Pagina las facturas de un tenant con sus fechas de emisión y de pago.',
});
