import type { InvoiceChange } from '@contracts/billing';
import type { Page } from '@contracts/platform';

/** Las facturas de un tenant según su dueño, el servicio billing, por páginas. */
export abstract class InvoiceHistory {
  abstract page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<InvoiceChange>>;
}
