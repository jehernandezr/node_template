import type { MoneyAmount } from '@contracts/platform';
import type { PlanFeature } from '@contracts/identity';
import type { UsageMetric } from '../enums/billing.enum.js';

/** Billing period: calendar dates `YYYY-MM-DD`. */
export interface BillingPeriod {
  start: string;
  end: string;
}

/** Limit of a metric in a plan. */
export interface QuotaLimit {
  metric: UsageMetric;
  limit: number;
}

/** Usage of a metric in a time window, with its idempotency key. */
export interface UsageRecord {
  metric: UsageMetric;
  quantity: number;
  windowStart: string;
  key: string;
}

/** Command that carries a batch of usage records of a tenant. */
export interface RecordUsagePayload {
  tenantId: string;
  records: UsageRecord[];
}

export interface SubscriptionChangedPayload {
  tenantId: string;
  subscriptionId: string;
  /** Previous plan; null on the first subscription. */
  previousPlanId: string | null;
  planId: string;
  changedAt: string;
}

export interface SubscriptionSuspendedPayload {
  tenantId: string;
  subscriptionId: string;
  suspendedAt: string;
}

export interface SubscriptionReactivatedPayload {
  tenantId: string;
  subscriptionId: string;
  reactivatedAt: string;
}

/** Current features and quotas of a tenant after a plan or status change. */
export interface EntitlementsChangedPayload {
  tenantId: string;
  features: PlanFeature[];
  quotas: QuotaLimit[];
  changedAt: string;
}

export interface InvoiceIssuedPayload {
  tenantId: string;
  invoiceId: string;
  number: string;
  period: BillingPeriod;
  total: MoneyAmount;
  issuedAt: string;
}

export interface InvoicePaidPayload {
  tenantId: string;
  invoiceId: string;
  number: string;
  total: MoneyAmount;
  paidAt: string;
}

export interface InvoiceFailedPayload {
  tenantId: string;
  invoiceId: string;
  number: string;
  total: MoneyAmount;
  /** Payment attempts made up to the failure. */
  attempts: number;
  failedAt: string;
}
