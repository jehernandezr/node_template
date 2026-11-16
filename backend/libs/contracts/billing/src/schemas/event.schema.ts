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
  .describe('Métrica de uso que tiene cuota.') satisfies z.ZodType<UsageMetric>;

export const BillingPeriodSchema = z
  .object({ start: CalendarDateSchema, end: CalendarDateSchema })
  .describe(
    'Periodo de facturación con fechas de calendario.',
  ) satisfies z.ZodType<BillingPeriod>;

export const QuotaLimitSchema = z
  .object({ metric: UsageMetricSchema, limit: z.int().min(0) })
  .describe(
    'Límite de una métrica en un plan.',
  ) satisfies z.ZodType<QuotaLimit>;

export const UsageRecordSchema = z
  .strictObject({
    metric: UsageMetricSchema,
    quantity: z.int().min(0).max(BillingLimits.maxUsageQuantity),
    windowStart: TimestampSchema,
    key: z.string().min(1).max(BillingLimits.usageKeyMaxLength),
  })
  .describe(
    'Uso de una métrica en una ventana, con su llave de idempotencia.',
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
    'Lote de registros de uso de un tenant.',
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
    'Cambió el plan de una suscripción.',
  ) satisfies z.ZodType<SubscriptionChangedPayload>;

export const SubscriptionSuspendedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    suspendedAt: TimestampSchema,
  })
  .describe(
    'Se suspendió una suscripción por falta de pago.',
  ) satisfies z.ZodType<SubscriptionSuspendedPayload>;

export const SubscriptionReactivatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    subscriptionId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'Se reactivó una suscripción suspendida.',
  ) satisfies z.ZodType<SubscriptionReactivatedPayload>;

export const EntitlementsChangedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    features: z.array(PlanFeatureSchema).max(BillingLimits.maxFeaturesPerPlan),
    quotas: z.array(QuotaLimitSchema).max(BillingLimits.maxQuotasPerPlan),
    changedAt: TimestampSchema,
  })
  .describe(
    'Cambiaron las funcionalidades o cuotas vigentes de un tenant.',
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
  .describe('Se emitió una factura.') satisfies z.ZodType<InvoiceIssuedPayload>;

export const InvoicePaidPayloadSchema = z
  .object({
    tenantId: IdSchema,
    invoiceId: IdSchema,
    number: InvoiceNumberSchema,
    total: MoneyAmountSchema,
    paidAt: TimestampSchema,
  })
  .describe('Se pagó una factura.') satisfies z.ZodType<InvoicePaidPayload>;

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
    'Falló el cobro de una factura.',
  ) satisfies z.ZodType<InvoiceFailedPayload>;
