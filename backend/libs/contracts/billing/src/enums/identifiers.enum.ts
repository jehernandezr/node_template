/** Códigos de error del servicio billing. */
export enum BillingErrorCode {
  SubscriptionNotFound = 'BILLING.SUBSCRIPTION.NOT_FOUND',
  SubscriptionNotChangeable = 'BILLING.SUBSCRIPTION.NOT_CHANGEABLE',
  PlanNotAvailable = 'BILLING.PLAN.NOT_AVAILABLE',
  PlanUsageExceedsLimit = 'BILLING.PLAN.USAGE_EXCEEDS_LIMIT',
  InvoiceNotFound = 'BILLING.INVOICE.NOT_FOUND',
  InvoiceInvalidState = 'BILLING.INVOICE.INVALID_STATE',
  InvoiceAmountMismatch = 'BILLING.INVOICE.AMOUNT_MISMATCH',
  QuotaExceeded = 'BILLING.QUOTA.EXCEEDED',
}

/** Identificadores de las rutas públicas de billing. */
export enum BillingRoute {
  GetSubscription = 'billing.subscription.get',
  GetUsage = 'billing.usage.get',
  ListPlans = 'billing.plan.list',
  ChangePlan = 'billing.subscription.change-plan',
  ListInvoices = 'billing.invoice.list',
  GetInvoice = 'billing.invoice.get',
}

/** Identificadores de las operaciones internas de billing. */
export enum BillingOperation {
  OpenAccount = 'billing.accounts.open.v1',
  CloseAccount = 'billing.accounts.close.v1',
  GetEntitlements = 'billing.entitlements.get.v1',
  CheckQuota = 'billing.quotas.check.v1',
  MarkInvoicePaid = 'billing.invoices.mark-paid.v1',
  MarkInvoiceFailed = 'billing.invoices.mark-failed.v1',
  ListInvoiceChanges = 'billing.invoices.list-changes.v1',
  TenantMoveSync = 'billing.tenant-move.sync.v1',
  TenantMoveFinalize = 'billing.tenant-move.finalize.v1',
  TenantMoveAbort = 'billing.tenant-move.abort.v1',
  TenantMoveSwitch = 'billing.tenant-move.switch.v1',
  TenantMoveCleanup = 'billing.tenant-move.cleanup.v1',
  TenantDirectoryPlace = 'billing.tenant-directory.place.v1',
  TenantDirectoryRemove = 'billing.tenant-directory.remove.v1',
}

/** Tipos CloudEvents de los eventos que publica billing. */
export enum BillingEvent {
  SubscriptionChanged = 'billing.subscription.changed.v1',
  SubscriptionSuspended = 'billing.subscription.suspended.v1',
  SubscriptionReactivated = 'billing.subscription.reactivated.v1',
  EntitlementsChanged = 'billing.entitlements.changed.v1',
  InvoiceIssued = 'billing.invoice.issued.v1',
  InvoicePaid = 'billing.invoice.paid.v1',
  InvoiceFailed = 'billing.invoice.failed.v1',
}

/** Tipos CloudEvents de los comandos que atiende billing. */
export enum BillingCommand {
  RecordUsage = 'billing.usage.record.v1',
}

/** Tópicos donde billing publica sus eventos. */
export enum BillingTopic {
  Events = 'billing-events',
}

/** Colas que consume billing. */
export enum BillingQueue {
  Usage = 'billing-usage',
  Identity = 'billing-identity',
}
