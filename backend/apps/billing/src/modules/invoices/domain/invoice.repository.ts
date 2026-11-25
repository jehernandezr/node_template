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
  abstract insert(invoice: Invoice): Promise<void>;
  abstract find(invoiceId: string): Promise<Invoice | undefined>;
  /** @throws OptimisticLockError if another write changed it since it was read. */
  abstract update(invoice: Invoice): Promise<void>;
  abstract page(request: InvoicePageRequest): Promise<readonly Invoice[]>;
  /** Whether the tenant has any issued invoice or, with `status`, any in that state. */
  abstract any(status?: InvoiceStatus): Promise<boolean>;
}
