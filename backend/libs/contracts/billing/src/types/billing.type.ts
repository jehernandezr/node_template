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

/** Plan del catálogo: precio, periodicidad, cuotas y funcionalidades. */
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

/** Suscripción del tenant con su plan y el periodo que cubre. */
export interface Subscription {
  id: string;
  plan: Plan;
  status: SubscriptionStatus;
  period: BillingPeriod;
}

/** Uso de una métrica frente a su límite en el periodo vigente. */
export interface QuotaUsage {
  metric: UsageMetric;
  limit: number;
  used: number;
}

export interface UsageOverview {
  items: QuotaUsage[];
}

/** Línea de una factura: cargo fijo o uso medido. */
export interface InvoiceLine {
  kind: InvoiceLineKind;
  description: string;
  amount: MoneyAmount;
}

/** Factura completa con sus líneas. */
export interface Invoice {
  id: string;
  number: string;
  period: BillingPeriod;
  status: InvoiceStatus;
  currency: Currency;
  lines: InvoiceLine[];
  total: MoneyAmount;
}

/** Factura sin líneas, para listados. */
export interface InvoiceSummary {
  id: string;
  number: string;
  period: BillingPeriod;
  status: InvoiceStatus;
  currency: Currency;
  total: MoneyAmount;
}

export type InvoicePage = Page<InvoiceSummary>;

/** Factura tal como la ve la sincronización de otro servicio, con las fechas de emisión y de pago. */
export interface InvoiceChange extends InvoiceSummary {
  issuedAt: string;
  paidAt: string | null;
}

export type InvoiceChangePage = Page<InvoiceChange>;

/** Entrada de la operación que pagina las facturas de un tenant. */
export interface ListInvoiceChangesInput {
  tenantId: string;
  limit?: number;
  after?: string;
}

/** Cambio de plan de la suscripción del tenant. */
export interface ChangePlanRequest {
  planId: string;
}

/** Filtros y paginación del listado de facturas. */
export interface ListInvoicesRequest {
  status?: InvoiceStatus;
  limit?: number;
  after?: string;
}

export interface GetInvoiceRequest {
  invoiceId: string;
}

/** Entrada de la operación interna que abre la cuenta de facturación de un tenant. */
export interface OpenBillingAccountInput {
  tenantId: string;
  ownerUserId: string;
}

/** Resultado de abrir la cuenta: la suscripción creada y su estado. */
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

/** Funcionalidades y cuotas vigentes de un tenant. */
export interface Entitlements {
  tenantId: string;
  status: SubscriptionStatus;
  features: PlanFeature[];
  quotas: QuotaLimit[];
}

export interface CheckQuotaInput {
  tenantId: string;
  metric: UsageMetric;
  /** Cantidad que se quiere consumir; si se omite se evalúa con uno. */
  requested?: number;
}

/** Resultado de consultar una cuota antes de consumirla. */
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
}

export interface MarkInvoiceFailedInput {
  tenantId: string;
  invoiceId: string;
  failedAt: string;
  reason?: string;
}

/** Estado de una factura después de marcarla como pagada o fallida. */
export interface InvoiceStateResult {
  invoiceId: string;
  status: InvoiceStatus;
}
