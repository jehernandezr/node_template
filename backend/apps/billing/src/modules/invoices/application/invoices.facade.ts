/** Tells the other billing modules whether a tenant already has invoices. */
export abstract class InvoicesFacade {
  /**
   * Whether the tenant has any issued invoice: if so, its account can no longer be closed by deleting it.
   * @param tenantId Tenant to check.
   * @returns `true` when the tenant has at least one issued invoice.
   */
  abstract hasInvoices(tenantId: string): Promise<boolean>;
}
