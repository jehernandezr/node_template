/** Una factura de algún tenant, para los jobs que recorren todos los shards. */
export interface TenantInvoice {
  readonly tenantId: string;
  readonly invoiceId: string;
}

/** Consultas sobre las facturas de todos los tenants, en todos los shards, para los jobs. */
export abstract class InvoiceMaintenance {
  /** Facturas emitidas que todavía no se pagaron ni fallaron. */
  abstract uncollected(): Promise<readonly TenantInvoice[]>;
}
