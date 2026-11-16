/** Estado de una suscripción. */
export enum SubscriptionStatus {
  Trialing = 'trialing',
  Active = 'active',
  PastDue = 'past_due',
  Suspended = 'suspended',
  Canceled = 'canceled',
}

/** Estado de una factura. */
export enum InvoiceStatus {
  Draft = 'draft',
  Issued = 'issued',
  Paid = 'paid',
  Failed = 'failed',
  Void = 'void',
}

/** Tipo de línea de una factura. */
export enum InvoiceLineKind {
  FixedFee = 'fixed_fee',
  Usage = 'usage',
}

/** Periodicidad de cobro de un plan. */
export enum PlanPeriodicity {
  Monthly = 'monthly',
  Annual = 'annual',
}

/** Monedas en que se factura. */
export enum Currency {
  Cop = 'COP',
  Usd = 'USD',
}

/** Métricas de uso que tienen cuota. */
export enum UsageMetric {
  Users = 'users',
  ApiCalls = 'api_calls',
  StorageGb = 'storage_gb',
}

/** Cómo se reduce el uso de un periodo a una cifra. */
export enum UsageAggregationKind {
  /** El mayor valor registrado en el periodo. */
  Max = 'max',
  /** La suma de lo registrado en el periodo. */
  Sum = 'sum',
}
