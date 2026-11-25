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
    'Status of a subscription.',
  ) satisfies z.ZodType<SubscriptionStatus>;

export const InvoiceStatusSchema = z
  .enum(InvoiceStatus)
  .describe('Status of an invoice.') satisfies z.ZodType<InvoiceStatus>;

export const InvoiceLineKindSchema = z
  .enum(InvoiceLineKind)
  .describe('Type of an invoice line.') satisfies z.ZodType<InvoiceLineKind>;

export const PlanPeriodicitySchema = z
  .enum(PlanPeriodicity)
  .describe('Billing interval of a plan.') satisfies z.ZodType<PlanPeriodicity>;

export const CurrencySchema = z
  .enum(Currency)
  .describe('Currency of the invoice.') satisfies z.ZodType<Currency>;

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
    'Catalog plan with its price and limits.',
  ) satisfies z.ZodType<Plan>;

export const PlanCatalogSchema = z
  .object({ items: z.array(PlanSchema).max(BillingLimits.maxPlans) })
  .describe('Catalog of available plans.') satisfies z.ZodType<PlanCatalog>;

export const SubscriptionSchema = z
  .object({
    id: IdSchema,
    plan: PlanSchema,
    status: SubscriptionStatusSchema,
    period: BillingPeriodSchema,
  })
  .describe(
    'Tenant subscription with its plan and current period.',
  ) satisfies z.ZodType<Subscription>;

export const QuotaUsageSchema = z
  .object({
    metric: UsageMetricSchema,
    limit: z.int().min(0),
    used: z.int().min(0),
  })
  .describe(
    'Usage of a metric against its limit.',
  ) satisfies z.ZodType<QuotaUsage>;

export const UsageOverviewSchema = z
  .object({
    items: z.array(QuotaUsageSchema).max(BillingLimits.maxQuotasPerPlan),
  })
  .describe(
    'Current period usage of each metric with a quota.',
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
  .describe('Invoice line.') satisfies z.ZodType<InvoiceLine>;

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
  .describe('Full invoice with its lines.') satisfies z.ZodType<Invoice>;

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
    'Invoice without lines, for listings.',
  ) satisfies z.ZodType<InvoiceSummary>;

export const InvoicePageSchema = pageOf(
  InvoiceSummarySchema,
  'Page of invoices, newest first.',
) satisfies z.ZodType<InvoicePage>;

export const InvoiceChangeSchema = InvoiceSummarySchema.extend({
  issuedAt: TimestampSchema,
  paidAt: TimestampSchema.nullable(),
}).describe(
  'Invoice with its issue and payment dates, to sync another service.',
) satisfies z.ZodType<InvoiceChange>;

export const InvoiceChangePageSchema = pageOf(
  InvoiceChangeSchema,
  'Page of a tenant invoices, newest first.',
) satisfies z.ZodType<InvoiceChangePage>;

export const ListInvoiceChangesInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Input to page the invoices of a tenant.',
  ) satisfies z.ZodType<ListInvoiceChangesInput>;

export const ChangePlanRequestSchema = z
  .strictObject({ planId: IdSchema })
  .describe(
    'Plan the subscription changes to.',
  ) satisfies z.ZodType<ChangePlanRequest>;

export const ListInvoicesRequestSchema = z
  .strictObject({
    status: InvoiceStatusSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Filters and pagination of the invoice listing.',
  ) satisfies z.ZodType<ListInvoicesRequest>;

export const GetInvoiceRequestSchema = z
  .strictObject({ invoiceId: IdSchema })
  .describe('Invoice to query.') satisfies z.ZodType<GetInvoiceRequest>;

export const OpenBillingAccountInputSchema = z
  .strictObject({ tenantId: IdSchema, ownerUserId: IdSchema })
  .describe(
    'Opens the billing account of a new tenant.',
  ) satisfies z.ZodType<OpenBillingAccountInput>;

export const BillingAccountResultSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    status: SubscriptionStatusSchema,
  })
  .describe(
    'Billing account opened with its subscription.',
  ) satisfies z.ZodType<BillingAccountResult>;

export const CloseBillingAccountInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Closes the billing account of a tenant.',
  ) satisfies z.ZodType<CloseBillingAccountInput>;

export const BillingAccountClosedSchema = z
  .object({ tenantId: IdSchema })
  .describe(
    'Billing account closed.',
  ) satisfies z.ZodType<BillingAccountClosed>;

export const GetEntitlementsInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant whose features and quotas are queried.',
  ) satisfies z.ZodType<GetEntitlementsInput>;

export const EntitlementsSchema = z
  .object({
    tenantId: IdSchema,
    status: SubscriptionStatusSchema,
    features: z.array(PlanFeatureSchema).max(BillingLimits.maxFeaturesPerPlan),
    quotas: z.array(QuotaLimitSchema).max(BillingLimits.maxQuotasPerPlan),
  })
  .describe(
    'Active features and quotas of a tenant.',
  ) satisfies z.ZodType<Entitlements>;

export const CheckQuotaInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    metric: UsageMetricSchema,
    requested: z.int().min(1).max(BillingLimits.maxUsageQuantity).optional(),
  })
  .describe(
    'Checks whether a tenant can consume an amount of a metric.',
  ) satisfies z.ZodType<CheckQuotaInput>;

export const QuotaCheckSchema = z
  .object({
    metric: UsageMetricSchema,
    limit: z.int().min(0),
    used: z.int().min(0),
    allowed: z.boolean(),
  })
  .describe('Result of a quota check.') satisfies z.ZodType<QuotaCheck>;

export const MarkInvoicePaidInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    paidAt: TimestampSchema,
    reference: z.string().min(1).max(BillingLimits.paymentReferenceMaxLength),
    amount: MoneyAmountSchema,
    attemptId: IdSchema.optional(),
  })
  .describe(
    'Marks an invoice as paid with the provider reference.',
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
    attemptId: IdSchema.optional(),
  })
  .describe(
    'Marks an invoice as failed after a declined charge.',
  ) satisfies z.ZodType<MarkInvoiceFailedInput>;

export const InvoiceStateResultSchema = z
  .object({ invoiceId: IdSchema, status: InvoiceStatusSchema })
  .describe(
    'Invoice status after the operation.',
  ) satisfies z.ZodType<InvoiceStateResult>;
