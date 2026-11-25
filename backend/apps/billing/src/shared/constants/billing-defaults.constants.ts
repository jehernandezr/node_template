/** Billing defaults. Trial and grace days have none: they are a business decision. */
export const BillingDefaults = {
  invoiceSeries: 'FAC',
  /** Code of the plan a new tenant's account opens with, on trial. */
  trialPlanCode: 'inicio',
  pageSize: 20,
  /** Digits of an invoice sequence number: `FAC-000042`. */
  invoiceNumberDigits: 6,
} as const;
