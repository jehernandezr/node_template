/** Valores por defecto de billing. Los días de prueba y de gracia no tienen: son una decisión comercial. */
export const BillingDefaults = {
  invoiceSeries: 'FAC',
  /** Código del plan con el que abre la cuenta de un tenant nuevo, en prueba. */
  trialPlanCode: 'inicio',
  pageSize: 20,
  /** Dígitos del consecutivo de una factura: `FAC-000042`. */
  invoiceNumberDigits: 6,
} as const;
