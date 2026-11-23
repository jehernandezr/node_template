/** Jobs periódicos de billing. */
export enum BillingJob {
  /** Cierra los periodos vencidos: termina las pruebas, emite las facturas y pide su cobro. */
  CloseInvoicePeriods = 'billing.close-invoice-periods',
  /** Suspende las suscripciones morosas que agotaron `BILLING_GRACE_DAYS`. */
  AdvanceDunning = 'billing.advance-dunning',
}
