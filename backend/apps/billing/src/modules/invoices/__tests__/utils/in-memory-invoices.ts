import type { InvoiceStatus } from '@contracts/billing';
import {
  InvoiceRepository,
  type InvoicePageRequest,
} from '../../domain/invoice.repository.js';
import { Invoice } from '../../domain/invoice.js';

/** Invoices of one tenant kept in memory as snapshots, so a change is only seen once saved. */
export class InMemoryInvoices extends InvoiceRepository {
  private readonly stored = new Map<string, Invoice>();

  override async insert(invoice: Invoice): Promise<void> {
    this.stored.set(
      invoice.snapshot().id,
      Invoice.rehydrate(invoice.snapshot()),
    );
  }

  override async find(invoiceId: string): Promise<Invoice | undefined> {
    const invoice = this.stored.get(invoiceId);
    return invoice === undefined
      ? undefined
      : Invoice.rehydrate(invoice.snapshot());
  }

  override async update(invoice: Invoice): Promise<void> {
    this.stored.set(
      invoice.snapshot().id,
      Invoice.rehydrate(invoice.snapshot()),
    );
  }

  override async page(
    request: InvoicePageRequest,
  ): Promise<readonly Invoice[]> {
    return [...this.stored.values()].slice(0, request.limit);
  }

  override async any(status?: InvoiceStatus): Promise<boolean> {
    return [...this.stored.values()].some(
      (invoice) => status === undefined || invoice.snapshot().status === status,
    );
  }

  /** The stored state of an invoice. */
  stateOf(invoiceId: string) {
    return this.stored.get(invoiceId)?.snapshot();
  }

  /** Every stored invoice, as a later read would see it. */
  all(): readonly Invoice[] {
    return [...this.stored.values()];
  }
}
