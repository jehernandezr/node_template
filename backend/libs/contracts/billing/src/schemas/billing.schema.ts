import { z } from 'zod';
import { PlanFeatureSchema } from '@contracts/identity';
import {
  CursorSchema,
  IdSchema,
  MoneyAmountSchema,
  PageLimitSchema,
  pageOf,
  TimestampSchema,
} from '@contracts/platform';
import { BillingLimits } from '../constants/billing.constants.js';
import {
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
  PlanPeriodicity,
  SubscriptionStatus,
} from '../enums/billing.enum.js';
import type {
  BillingAccountClosed,
  BillingAccountResult,
  ChangePlanRequest,
  CheckQuotaInput,
  CloseBillingAccountInput,
  Entitlements,
  GetEntitlementsInput,
  GetInvoiceRequest,
  Invoice,
  InvoiceChange,
  InvoiceChangePage,
  InvoiceLine,
  InvoicePage,
  InvoiceStateResult,
  InvoiceSummary,
  ListInvoiceChangesInput,
  ListInvoicesRequest,
  MarkInvoiceFailedInput,
  MarkInvoicePaidInput,
  OpenBillingAccountInput,
  Plan,
  PlanCatalog,
  QuotaCheck,
  QuotaUsage,
  Subscription,
  UsageOverview,
} from '../types/billing.type.js';
import {
  BillingPeriodSchema,
  QuotaLimitSchema,
  UsageMetricSchema,
} from './event.schema.js';

export const SubscriptionStatusSchema = z
  .enum(SubscriptionStatus)
  .describe(
    'Estado de una suscripción.',
  ) satisfies z.ZodType<SubscriptionStatus>;

export const InvoiceStatusSchema = z
  .enum(InvoiceStatus)
  .describe('Estado de una factura.') satisfies z.ZodType<InvoiceStatus>;

export const InvoiceLineKindSchema = z
  .enum(InvoiceLineKind)
  .describe(
    'Tipo de línea de una factura.',
  ) satisfies z.ZodType<InvoiceLineKind>;

export const PlanPeriodicitySchema = z
  .enum(PlanPeriodicity)
  .describe(
    'Periodicidad de cobro de un plan.',
  ) satisfies z.ZodType<PlanPeriodicity>;

export const CurrencySchema = z
  .enum(Currency)
  .describe('Moneda en que se factura.') satisfies z.ZodType<Currency>;

export const PlanSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(BillingLimits.planNameMaxLength),
    price: MoneyAmountSchema,
    periodicity: PlanPeriodicitySchema,
    quotas: z.array(QuotaLimitSchema).max(BillingLimits.maxQuotasPerPlan),
    features: z.array(PlanFeatureSchema).max(BillingLimits.maxFeaturesPerPlan),
  })
  .describe(
    'Plan del catálogo con su precio y sus límites.',
  ) satisfies z.ZodType<Plan>;

export const PlanCatalogSchema = z
  .object({ items: z.array(PlanSchema).max(BillingLimits.maxPlans) })
  .describe('Catálogo de planes disponibles.') satisfies z.ZodType<PlanCatalog>;

export const SubscriptionSchema = z
  .object({
    id: IdSchema,
    plan: PlanSchema,
    status: SubscriptionStatusSchema,
    period: BillingPeriodSchema,
  })
  .describe(
    'Suscripción del tenant con su plan y el periodo vigente.',
  ) satisfies z.ZodType<Subscription>;

export const QuotaUsageSchema = z
  .object({
    metric: UsageMetricSchema,
    limit: z.int().min(0),
    used: z.int().min(0),
  })
  .describe(
    'Uso de una métrica frente a su límite.',
  ) satisfies z.ZodType<QuotaUsage>;

export const UsageOverviewSchema = z
  .object({
    items: z.array(QuotaUsageSchema).max(BillingLimits.maxQuotasPerPlan),
  })
  .describe(
    'Uso del periodo vigente de cada métrica con cuota.',
  ) satisfies z.ZodType<UsageOverview>;

export const InvoiceLineSchema = z
  .object({
    kind: InvoiceLineKindSchema,
    description: z
      .string()
      .min(1)
      .max(BillingLimits.invoiceDescriptionMaxLength),
    amount: MoneyAmountSchema,
  })
  .describe('Línea de una factura.') satisfies z.ZodType<InvoiceLine>;

export const InvoiceSchema = z
  .object({
    id: IdSchema,
    number: z.string().min(1).max(BillingLimits.invoiceNumberMaxLength),
    period: BillingPeriodSchema,
    status: InvoiceStatusSchema,
    currency: CurrencySchema,
    lines: z.array(InvoiceLineSchema).max(BillingLimits.maxLinesPerInvoice),
    total: MoneyAmountSchema,
  })
  .describe('Factura completa con sus líneas.') satisfies z.ZodType<Invoice>;

export const InvoiceSummarySchema = z
  .object({
    id: IdSchema,
    number: z.string().min(1).max(BillingLimits.invoiceNumberMaxLength),
    period: BillingPeriodSchema,
    status: InvoiceStatusSchema,
    currency: CurrencySchema,
    total: MoneyAmountSchema,
  })
  .describe(
    'Factura sin líneas, para listados.',
  ) satisfies z.ZodType<InvoiceSummary>;

export const InvoicePageSchema = pageOf(
  InvoiceSummarySchema,
  'Página de facturas, más nuevas primero.',
) satisfies z.ZodType<InvoicePage>;

export const InvoiceChangeSchema = InvoiceSummarySchema.extend({
  issuedAt: TimestampSchema,
  paidAt: TimestampSchema.nullable(),
}).describe(
  'Factura con sus fechas de emisión y de pago, para sincronizar otro servicio.',
) satisfies z.ZodType<InvoiceChange>;

export const InvoiceChangePageSchema = pageOf(
  InvoiceChangeSchema,
  'Página de facturas de un tenant, más nuevas primero.',
) satisfies z.ZodType<InvoiceChangePage>;

export const ListInvoiceChangesInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Entrada para paginar las facturas de un tenant.',
  ) satisfies z.ZodType<ListInvoiceChangesInput>;

export const ChangePlanRequestSchema = z
  .strictObject({ planId: IdSchema })
  .describe(
    'Plan al que cambia la suscripción.',
  ) satisfies z.ZodType<ChangePlanRequest>;

export const ListInvoicesRequestSchema = z
  .strictObject({
    status: InvoiceStatusSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Filtros y paginación del listado de facturas.',
  ) satisfies z.ZodType<ListInvoicesRequest>;

export const GetInvoiceRequestSchema = z
  .strictObject({ invoiceId: IdSchema })
  .describe('Factura a consultar.') satisfies z.ZodType<GetInvoiceRequest>;

export const OpenBillingAccountInputSchema = z
  .strictObject({ tenantId: IdSchema, ownerUserId: IdSchema })
  .describe(
    'Abre la cuenta de facturación de un tenant nuevo.',
  ) satisfies z.ZodType<OpenBillingAccountInput>;

export const BillingAccountResultSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    status: SubscriptionStatusSchema,
  })
  .describe(
    'Cuenta de facturación abierta con su suscripción.',
  ) satisfies z.ZodType<BillingAccountResult>;

export const CloseBillingAccountInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Cierra la cuenta de facturación de un tenant.',
  ) satisfies z.ZodType<CloseBillingAccountInput>;

export const BillingAccountClosedSchema = z
  .object({ tenantId: IdSchema })
  .describe(
    'Cuenta de facturación cerrada.',
  ) satisfies z.ZodType<BillingAccountClosed>;

export const GetEntitlementsInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant cuyas funcionalidades y cuotas se consultan.',
  ) satisfies z.ZodType<GetEntitlementsInput>;

export const EntitlementsSchema = z
  .object({
    tenantId: IdSchema,
    status: SubscriptionStatusSchema,
    features: z.array(PlanFeatureSchema).max(BillingLimits.maxFeaturesPerPlan),
    quotas: z.array(QuotaLimitSchema).max(BillingLimits.maxQuotasPerPlan),
  })
  .describe(
    'Funcionalidades y cuotas vigentes de un tenant.',
  ) satisfies z.ZodType<Entitlements>;

export const CheckQuotaInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    metric: UsageMetricSchema,
    requested: z.int().min(1).max(BillingLimits.maxUsageQuantity).optional(),
  })
  .describe(
    'Consulta si un tenant puede consumir una cantidad de una métrica.',
  ) satisfies z.ZodType<CheckQuotaInput>;

export const QuotaCheckSchema = z
  .object({
    metric: UsageMetricSchema,
    limit: z.int().min(0),
    used: z.int().min(0),
    allowed: z.boolean(),
  })
  .describe(
    'Resultado de consultar una cuota.',
  ) satisfies z.ZodType<QuotaCheck>;

export const MarkInvoicePaidInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    paidAt: TimestampSchema,
    reference: z.string().min(1).max(BillingLimits.paymentReferenceMaxLength),
  })
  .describe(
    'Marca una factura como pagada con la referencia del proveedor.',
  ) satisfies z.ZodType<MarkInvoicePaidInput>;

export const MarkInvoiceFailedInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    failedAt: TimestampSchema,
    reason: z
      .string()
      .min(1)
      .max(BillingLimits.failureReasonMaxLength)
      .optional(),
  })
  .describe(
    'Marca una factura como fallida después de un cobro rechazado.',
  ) satisfies z.ZodType<MarkInvoiceFailedInput>;

export const InvoiceStateResultSchema = z
  .object({ invoiceId: IdSchema, status: InvoiceStatusSchema })
  .describe(
    'Estado de una factura después de la operación.',
  ) satisfies z.ZodType<InvoiceStateResult>;
