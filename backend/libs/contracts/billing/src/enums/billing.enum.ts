/** Status of a subscription. */
export enum SubscriptionStatus {
  Trialing = 'trialing',
  Active = 'active',
  PastDue = 'past_due',
  Suspended = 'suspended',
  Canceled = 'canceled',
}

/** Status of an invoice. */
export enum InvoiceStatus {
  Draft = 'draft',
  Issued = 'issued',
  Paid = 'paid',
  Failed = 'failed',
  Void = 'void',
}

/** Line type of an invoice. */
export enum InvoiceLineKind {
  FixedFee = 'fixed_fee',
  Usage = 'usage',
}

/** Billing frequency of a plan. */
export enum PlanPeriodicity {
  Monthly = 'monthly',
  Annual = 'annual',
}

/** Currencies in which billing happens. */
export enum Currency {
  Cop = 'COP',
  Usd = 'USD',
}

/** Usage metrics that have a quota. */
export enum UsageMetric {
  Users = 'users',
  ApiCalls = 'api_calls',
  StorageGb = 'storage_gb',
}

/** How a period's usage is reduced to a figure. */
export enum UsageAggregationKind {
  /** The highest value recorded in the period. */
  Max = 'max',
  /** The sum of what was recorded in the period. */
  Sum = 'sum',
}
