/** Lo que `invoices` ofrece a los otros módulos. */
export abstract class InvoicesFacade {
  /** Si el tenant tiene alguna factura emitida: entonces su cuenta ya no se cierra borrándola. */
  abstract hasInvoices(tenantId: string): Promise<boolean>;
}
