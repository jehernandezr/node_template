import type { MoneyAmount } from '@contracts/platform';
import type { PlanFeature } from '@contracts/identity';
import type { UsageMetric } from '../enums/billing.enum.js';

/** Periodo de facturación: fechas de calendario `AAAA-MM-DD`. */
export interface BillingPeriod {
  start: string;
  end: string;
}

/** Límite de una métrica en un plan. */
export interface QuotaLimit {
  metric: UsageMetric;
  limit: number;
}

/** Uso de una métrica en una ventana de tiempo, con su llave de idempotencia. */
export interface UsageRecord {
  metric: UsageMetric;
  quantity: number;
  windowStart: string;
  key: string;
}

/** Comando que lleva un lote de registros de uso de un tenant. */
export interface RecordUsagePayload {
  tenantId: string;
  records: UsageRecord[];
}

export interface SubscriptionChangedPayload {
  tenantId: string;
  subscriptionId: string;
  /** Plan anterior; null en la primera suscripción. */
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

/** Funcionalidades y cuotas vigentes de un tenant después de un cambio de plan o de estado. */
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
  /** Intentos de cobro hechos hasta el fallo. */
  attempts: number;
  failedAt: string;
}
