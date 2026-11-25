/** Una factura de algún tenant, para los jobs que recorren todos los shards. */
export interface TenantInvoice {
  readonly tenantId: string;
  readonly invoiceId: string;
}

/** Consultas sobre las facturas de todos los tenants, en todos los shards, para los jobs. */
export abstract class InvoiceMaintenance {
  /**
   * Facturas sin pagar cuyo cobro ya toca: recién emitidas o con un reintento vencido.
   * @param now Momento de referencia.
   * @returns Las facturas de todos los shards, sin los tenants ya trasladados.
   */
  abstract dueForCollection(now: Date): Promise<readonly TenantInvoice[]>;
}
