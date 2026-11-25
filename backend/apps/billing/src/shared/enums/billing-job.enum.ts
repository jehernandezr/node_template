/** Billing periodic jobs. */
export enum BillingJob {
  /** Closes expired periods: ends trials, issues invoices and requests their charge. */
  CloseInvoicePeriods = 'billing.close-invoice-periods',
  /** Suspends past-due subscriptions that exhausted `BILLING_GRACE_DAYS`. */
  AdvanceDunning = 'billing.advance-dunning',
}
