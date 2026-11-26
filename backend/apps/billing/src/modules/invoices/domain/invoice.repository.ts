import type { InvoiceStatus } from '@contracts/billing';
import type { Invoice } from './invoice.js';

/** A page of invoices, newest to oldest. */
export interface InvoicePageRequest {
  readonly status?: InvoiceStatus;
  readonly afterId?: string;
  readonly limit: number;
}

/** Invoices of the tenant of the open `ShardScope`. */
export abstract class InvoiceRepository {
  /**
   * Stores a new invoice with its lines.
   * @param invoice Invoice to store.
   */
  abstract insert(invoice: Invoice): Promise<void>;
  /**
   * Reads an invoice of the tenant in scope.
   * @param invoiceId Invoice to read.
   * @returns The invoice, or `undefined` when the tenant does not have it.
   */
  abstract find(invoiceId: string): Promise<Invoice | undefined>;
  /**
   * Saves the changes of an invoice.
   * @param invoice Invoice read earlier and changed.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(invoice: Invoice): Promise<void>;
  /**
   * Reads a page of the tenant invoices, newest first.
   * @param request Cursor and page size.
   * @returns The invoices of the page.
   */
  abstract page(request: InvoicePageRequest): Promise<readonly Invoice[]>;
  /**
   * Whether the tenant has any issued invoice or, with `status`, any in that state.
   * @param status Status to look for; any status when omitted.
   * @returns `true` when such an invoice exists.
   */
  abstract any(status?: InvoiceStatus): Promise<boolean>;
}
