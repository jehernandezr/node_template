import type { MoneyAmount, Page } from '@contracts/platform';
import type { PlanFeature } from '@contracts/identity';
import type {
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
  PlanPeriodicity,
  SubscriptionStatus,
  UsageMetric,
} from '../enums/billing.enum.js';
import type { BillingPeriod, QuotaLimit } from './event.type.js';

/** Catalog plan: price, billing interval, quotas and features. */
export interface Plan {
  id: string;
  name: string;
  price: MoneyAmount;
  periodicity: PlanPeriodicity;
  quotas: QuotaLimit[];
  features: PlanFeature[];
}

export interface PlanCatalog {
  items: Plan[];
}

/** Tenant subscription with its plan and the period it covers. */
export interface Subscription {
  id: string;
  plan: Plan;
  status: SubscriptionStatus;
  period: BillingPeriod;
}

/** Usage of a metric against its limit in the current period. */
export interface QuotaUsage {
  metric: UsageMetric;
  limit: number;
  used: number;
}

export interface UsageOverview {
  items: QuotaUsage[];
}

/** Invoice line: fixed charge or metered usage. */
export interface InvoiceLine {
  kind: InvoiceLineKind;
  description: string;
  amount: MoneyAmount;
}

/** Full invoice with its lines. */
export interface Invoice {
  id: string;
  number: string;
  period: BillingPeriod;
  status: InvoiceStatus;
  currency: Currency;
  lines: InvoiceLine[];
  total: MoneyAmount;
}

/** Invoice without lines, for listings. */
export interface InvoiceSummary {
  id: string;
  number: string;
  period: BillingPeriod;
  status: InvoiceStatus;
  currency: Currency;
  total: MoneyAmount;
}

export type InvoicePage = Page<InvoiceSummary>;

/** Invoice as another service's synchronization sees it, with the issue and payment dates. */
export interface InvoiceChange extends InvoiceSummary {
  issuedAt: string;
  paidAt: string | null;
}

export type InvoiceChangePage = Page<InvoiceChange>;

/** Input of the operation that pages a tenant's invoices. */
export interface ListInvoiceChangesInput {
  tenantId: string;
  limit?: number;
  after?: string;
}

/** Plan change of the tenant's subscription. */
export interface ChangePlanRequest {
  planId: string;
}

/** Filters and pagination of the invoice listing. */
export interface ListInvoicesRequest {
  status?: InvoiceStatus;
  limit?: number;
  after?: string;
}

export interface GetInvoiceRequest {
  invoiceId: string;
}

/** Input of the internal operation that opens a tenant's billing account. */
export interface OpenBillingAccountInput {
  tenantId: string;
  ownerUserId: string;
}

/** Result of opening the account: the created subscription and its status. */
export interface BillingAccountResult {
  tenantId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
}

export interface CloseBillingAccountInput {
  tenantId: string;
}

export interface BillingAccountClosed {
  tenantId: string;
}

export interface GetEntitlementsInput {
  tenantId: string;
}

/** Current features and quotas of a tenant. */
export interface Entitlements {
  tenantId: string;
  status: SubscriptionStatus;
  features: PlanFeature[];
  quotas: QuotaLimit[];
}

export interface CheckQuotaInput {
  tenantId: string;
  metric: UsageMetric;
  /** Quantity to consume; if omitted it is evaluated with one. */
  requested?: number;
}

/** Result of checking a quota before consuming it. */
export interface QuotaCheck {
  metric: UsageMetric;
  limit: number;
  used: number;
  allowed: boolean;
}

export interface MarkInvoicePaidInput {
  tenantId: string;
  invoiceId: string;
  paidAt: string;
  reference: string;
  /** What the provider charged: it must be the invoice total in its currency. */
  amount: MoneyAmount;
  /** Id of the attempt billing passed to the provider as idempotency key; without it, the payment did not originate in billing. */
  attemptId?: string;
}

export interface MarkInvoiceFailedInput {
  tenantId: string;
  invoiceId: string;
  failedAt: string;
  reason?: string;
  /** Id of the attempt billing passed to the provider as idempotency key; without it, the charge did not originate in billing. */
  attemptId?: string;
}

/** Status of an invoice after marking it as paid or failed. */
export interface InvoiceStateResult {
  invoiceId: string;
  status: InvoiceStatus;
}
