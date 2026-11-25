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
 * Opens the billing account of a new tenant. Its reversal is closing the
 * account, so the saga does not leave an orphan subscription.
 */
export const OpenAccountOperation = defineOperation({
  id: BillingOperation.OpenAccount,
  input: OpenBillingAccountInputSchema,
  output: BillingAccountResultSchema,
  idempotent: true,
  compensatedBy: BillingOperation.CloseAccount,
  errors: [BillingErrorCode.PlanNotAvailable],
  timeoutMs: 5000,
  description: 'Opens the billing account of a tenant with its subscription.',
});

/**
 * Closes the billing account. It only runs as compensation for the opening:
 * with no invoice issued it deletes the subscription and there is nothing to restore.
 */
export const CloseAccountOperation = defineOperation({
  id: BillingOperation.CloseAccount,
  input: CloseBillingAccountInputSchema,
  output: BillingAccountClosedSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Only runs as compensation of the opening: with no invoice issued it deletes the subscription and there is nothing to restore.',
  errors: [BillingErrorCode.InvoiceInvalidState],
  timeoutMs: 5000,
  description: 'Closes the billing account of a tenant.',
});

/** Reads the current features and quotas of a tenant. */
export const GetEntitlementsOperation = defineOperation({
  id: BillingOperation.GetEntitlements,
  input: GetEntitlementsInputSchema,
  output: EntitlementsSchema,
  idempotent: true,
  mutating: false,
  errors: [BillingErrorCode.SubscriptionNotFound],
  timeoutMs: 5000,
  description: 'Gets the active features and quotas of a tenant.',
});

/** Checks whether a tenant can consume a quantity of a metric. */
export const CheckQuotaOperation = defineOperation({
  id: BillingOperation.CheckQuota,
  input: CheckQuotaInputSchema,
  output: QuotaCheckSchema,
  idempotent: true,
  mutating: false,
  errors: [BillingErrorCode.SubscriptionNotFound],
  timeoutMs: 1000,
  description: 'Checks whether a tenant can consume an amount of a metric.',
});

/**
 * Marks an invoice as paid. The payment happened outside billing; a mistake is
 * corrected with a note, not with a reversal.
 */
export const MarkInvoicePaidOperation = defineOperation({
  id: BillingOperation.MarkInvoicePaid,
  input: MarkInvoicePaidInputSchema,
  output: InvoiceStateResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'The payment happened outside billing; a mistake is fixed with a note, not with a reversal.',
  errors: [
    BillingErrorCode.InvoiceNotFound,
    BillingErrorCode.InvoiceInvalidState,
    BillingErrorCode.InvoiceAmountMismatch,
  ],
  timeoutMs: 5000,
  description:
    'Marks an invoice as paid with the provider reference and the amount charged, which must be its total.',
});

/**
 * Marks an invoice as failed. The charge failed outside billing; a mistake is
 * corrected with a note, not with a reversal.
 */
export const MarkInvoiceFailedOperation = defineOperation({
  id: BillingOperation.MarkInvoiceFailed,
  input: MarkInvoiceFailedInputSchema,
  output: InvoiceStateResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'The charge failed outside billing; a mistake is fixed with a note, not with a reversal.',
  errors: [
    BillingErrorCode.InvoiceNotFound,
    BillingErrorCode.InvoiceInvalidState,
  ],
  timeoutMs: 5000,
  description: 'Marks an invoice as failed after a declined charge.',
});

/** Pages a tenant's invoices, from newest to oldest, so another service can backfill its copy. */
export const ListInvoiceChangesOperation = defineOperation({
  id: BillingOperation.ListInvoiceChanges,
  input: ListInvoiceChangesInputSchema,
  output: InvoiceChangePageSchema,
  idempotent: true,
  mutating: false,
  timeoutMs: 5000,
  description:
    'Pages the invoices of a tenant with their issue and payment dates.',
});
