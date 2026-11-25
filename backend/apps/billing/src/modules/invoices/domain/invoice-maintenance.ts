/** Una factura de algún tenant, para los jobs que recorren todos los shards. */
export interface TenantInvoice {
  readonly tenantId: string;
  readonly invoiceId: string;
}

/** Consultas sobre las facturas de todos los tenants, en todos los shards, para los jobs. */
export abstract class InvoiceMaintenance {
  /** Facturas sin pagar cuyo cobro ya toca en `now`: recién emitidas o con un reintento vencido. */
  abstract dueForCollection(now: Date): Promise<readonly TenantInvoice[]>;
}
