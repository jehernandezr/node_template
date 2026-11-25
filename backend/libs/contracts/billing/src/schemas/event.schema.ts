import { z } from 'zod';
import { PlanFeatureSchema } from '@contracts/identity';
import {
  CalendarDateSchema,
  IdSchema,
  MoneyAmountSchema,
  TimestampSchema,
} from '@contracts/platform';
import { BillingLimits } from '../constants/billing.constants.js';
import { UsageMetric } from '../enums/billing.enum.js';
import type {
  BillingPeriod,
  EntitlementsChangedPayload,
  InvoiceFailedPayload,
  InvoiceIssuedPayload,
  InvoicePaidPayload,
  QuotaLimit,
  RecordUsagePayload,
  SubscriptionChangedPayload,
  SubscriptionReactivatedPayload,
  SubscriptionSuspendedPayload,
  UsageRecord,
} from '../types/event.type.js';

export const UsageMetricSchema = z
  .enum(UsageMetric)
  .describe('Usage metric that has a quota.') satisfies z.ZodType<UsageMetric>;

export const BillingPeriodSchema = z
  .object({ start: CalendarDateSchema, end: CalendarDateSchema })
  .describe(
    'Billing period with calendar dates.',
  ) satisfies z.ZodType<BillingPeriod>;

export const QuotaLimitSchema = z
  .object({ metric: UsageMetricSchema, limit: z.int().min(0) })
  .describe('Limit of a metric in a plan.') satisfies z.ZodType<QuotaLimit>;

export const UsageRecordSchema = z
  .strictObject({
    metric: UsageMetricSchema,
    quantity: z.int().min(0).max(BillingLimits.maxUsageQuantity),
    windowStart: TimestampSchema,
    key: z.string().min(1).max(BillingLimits.usageKeyMaxLength),
  })
  .describe(
    'Usage of a metric in a window, with its idempotency key.',
  ) satisfies z.ZodType<UsageRecord>;

export const RecordUsagePayloadSchema = z
  .strictObject({
    tenantId: IdSchema,
    records: z
      .array(UsageRecordSchema)
      .min(1)
      .max(BillingLimits.maxUsageRecordsPerBatch),
  })
  .describe(
    'Batch of usage records of a tenant.',
  ) satisfies z.ZodType<RecordUsagePayload>;

export const SubscriptionChangedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    previousPlanId: IdSchema.nullable(),
    planId: IdSchema,
    changedAt: TimestampSchema,
  })
  .describe(
    'The plan of a subscription changed.',
  ) satisfies z.ZodType<SubscriptionChangedPayload>;

export const SubscriptionSuspendedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    suspendedAt: TimestampSchema,
  })
  .describe(
    'A subscription was suspended for non-payment.',
  ) satisfies z.ZodType<SubscriptionSuspendedPayload>;

export const SubscriptionReactivatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'A suspended subscription was reactivated.',
  ) satisfies z.ZodType<SubscriptionReactivatedPayload>;

export const EntitlementsChangedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    features: z.array(PlanFeatureSchema).max(BillingLimits.maxFeaturesPerPlan),
    quotas: z.array(QuotaLimitSchema).max(BillingLimits.maxQuotasPerPlan),
    changedAt: TimestampSchema,
  })
  .describe(
    'The active features or quotas of a tenant changed.',
  ) satisfies z.ZodType<EntitlementsChangedPayload>;

const InvoiceNumberSchema = z
  .string()
  .min(1)
  .max(BillingLimits.invoiceNumberMaxLength);

export const InvoiceIssuedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    number: InvoiceNumberSchema,
    period: BillingPeriodSchema,
    total: MoneyAmountSchema,
    issuedAt: TimestampSchema,
  })
  .describe('An invoice was issued.') satisfies z.ZodType<InvoiceIssuedPayload>;

export const InvoicePaidPayloadSchema = z
  .object({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    number: InvoiceNumberSchema,
    total: MoneyAmountSchema,
    paidAt: TimestampSchema,
  })
  .describe('An invoice was paid.') satisfies z.ZodType<InvoicePaidPayload>;

export const InvoiceFailedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    number: InvoiceNumberSchema,
    total: MoneyAmountSchema,
    attempts: z.int().min(1),
    failedAt: TimestampSchema,
  })
  .describe(
    'Charging an invoice failed.',
  ) satisfies z.ZodType<InvoiceFailedPayload>;
