import { UsageAggregationKind } from '../enums/billing.enum.js';

/** Límites de los campos de billing. Todo texto y toda lista del contrato se acotan con uno de estos valores. */
export const BillingLimits = {
  planNameMaxLength: 120,
  invoiceNumberMaxLength: 32,
  invoiceDescriptionMaxLength: 200,
  maxQuotasPerPlan: 10,
  maxFeaturesPerPlan: 20,
  maxLinesPerInvoice: 200,
  /** Llave de idempotencia de un registro de uso. */
  usageKeyMaxLength: 200,
  /** Registros de uso que caben en un solo comando. */
  maxUsageRecordsPerBatch: 500,
  /** Mayor cantidad de una métrica que acepta un registro. */
  maxUsageQuantity: 1_000_000_000,
  maxPlans: 20,
  /** Referencia del pago que informa el proveedor. */
  paymentReferenceMaxLength: 120,
  failureReasonMaxLength: 200,
} as const;

/**
 * Cómo se reduce cada métrica (`UsageMetric`) a la cifra del periodo. Las claves
 * son los miembros de `UsageMetric` en camelCase.
 */
export const UsageAggregation = {
  users: UsageAggregationKind.Max,
  apiCalls: UsageAggregationKind.Sum,
  storageGb: UsageAggregationKind.Max,
} as const;
