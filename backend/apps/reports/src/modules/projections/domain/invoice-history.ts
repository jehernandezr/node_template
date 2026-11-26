import type { InvoiceChange } from '@contracts/billing';
import type { Page } from '@contracts/platform';

/** A tenant's invoices according to their owner, the billing service, by pages. */
export abstract class InvoiceHistory {
  /**
   * Reads a page of invoice changes of billing, for the backfill.
   * @param tenantId Tenant to read.
   * @param after Cursor of the previous page.
   * @param limit Page size.
   * @returns The changes and the next cursor.
   */
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<InvoiceChange>>;
}
