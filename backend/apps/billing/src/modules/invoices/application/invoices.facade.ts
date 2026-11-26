/** Tells the other billing modules whether a tenant already has invoices. */
export abstract class InvoicesFacade {
  /** Whether the tenant has any issued invoice: if so, its account can no longer be closed by deleting it. */
  abstract hasInvoices(tenantId: string): Promise<boolean>;
}
