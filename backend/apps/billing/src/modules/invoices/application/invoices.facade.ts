/** What `invoices` offers to the other modules. */
export abstract class InvoicesFacade {
  /** Whether the tenant has any issued invoice: if so, its account can no longer be closed by deleting it. */
  abstract hasInvoices(tenantId: string): Promise<boolean>;
}
