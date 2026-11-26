import {
  InvoiceMaintenance,
  type TenantInvoice,
} from '../../domain/invoice-maintenance.js';
import type { InMemoryInvoices } from './in-memory-invoices.js';

/** `InvoiceMaintenance` over the invoices of the one tenant the in-memory repository keeps. */
export class TenantInvoiceMaintenance extends InvoiceMaintenance {
  constructor(
    private readonly tenantId: string,
    private readonly invoices: InMemoryInvoices,
  ) {
    super();
  }

  override async dueForCollection(
    now: Date,
  ): Promise<readonly TenantInvoice[]> {
    return this.invoices
      .all()
      .filter((invoice) => invoice.isDueForCollection(now))
      .map((invoice) => ({
        tenantId: this.tenantId,
        invoiceId: invoice.snapshot().id,
      }));
  }
}
