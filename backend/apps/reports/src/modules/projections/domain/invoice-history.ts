import type { InvoiceChange } from '@contracts/billing';
import type { Page } from '@contracts/platform';

/** A tenant's invoices according to their owner, the billing service, by pages. */
export abstract class InvoiceHistory {
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<InvoiceChange>>;
}
