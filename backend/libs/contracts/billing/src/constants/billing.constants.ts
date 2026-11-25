import { UsageAggregationKind } from '../enums/billing.enum.js';

/** Limits of the billing fields. Every text and every list in the contract is bounded by one of these values. */
export const BillingLimits = {
  planNameMaxLength: 120,
  invoiceNumberMaxLength: 32,
  invoiceDescriptionMaxLength: 200,
  maxQuotasPerPlan: 10,
  maxFeaturesPerPlan: 20,
  maxLinesPerInvoice: 200,
  /** Idempotency key of a usage record. */
  usageKeyMaxLength: 200,
  /** Usage records that fit in a single command. */
  maxUsageRecordsPerBatch: 500,
  /** Largest quantity of a metric a record accepts. */
  maxUsageQuantity: 1_000_000_000,
  maxPlans: 20,
  /** Payment reference reported by the provider. */
  paymentReferenceMaxLength: 120,
  failureReasonMaxLength: 200,
} as const;

/**
 * How each metric (`UsageMetric`) is reduced to the period figure. The keys
 * are the members of `UsageMetric` in camelCase.
 */
export const UsageAggregation = {
  users: UsageAggregationKind.Max,
  apiCalls: UsageAggregationKind.Sum,
  storageGb: UsageAggregationKind.Max,
} as const;
