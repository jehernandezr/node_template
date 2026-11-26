import type { InvoiceStatus } from '@contracts/billing';
import {
  InvoiceRepository,
  type InvoicePageRequest,
} from '../../domain/invoice.repository.js';
import { Invoice } from '../../domain/invoice.js';

/** Invoices of one tenant kept in memory as snapshots, recording each read in a shared journal. */
export class InMemoryInvoices extends InvoiceRepository {
  private readonly stored = new Map<string, Invoice>();

  constructor(private readonly journal: string[] = []) {
    super();
  }

  override async insert(invoice: Invoice): Promise<void> {
    this.stored.set(
      invoice.snapshot().id,
      Invoice.rehydrate(invoice.snapshot()),
    );
  }

  override async find(invoiceId: string): Promise<Invoice | undefined> {
    this.journal.push(`find:${invoiceId}`);
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
}
