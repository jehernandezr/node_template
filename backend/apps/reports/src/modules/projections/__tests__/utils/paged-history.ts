import type { InvoiceChange } from '@contracts/billing';
import type { Page } from '@contracts/platform';
import type { TaskChange } from '@contracts/tasks';
import { InvoiceHistory } from '../../domain/invoice-history.js';
import { TaskHistory } from '../../domain/task-history.js';

/** The changes of each tenant served in pages whose cursor is the offset, failing for the tenants marked down. */
class PagedChanges<T> {
  readonly byTenant = new Map<string, T[]>();
  readonly down = new Set<string>();
  pagesServed = 0;

  page(tenantId: string, after: string | undefined, limit: number): Page<T> {
    if (this.down.has(tenantId)) {
      throw new Error('history unavailable');
    }
    this.pagesServed += 1;
    const items = this.byTenant.get(tenantId) ?? [];
    const start = after === undefined ? 0 : Number(after);
    const end = start + limit;
    return {
      items: items.slice(start, end),
      nextCursor: end < items.length ? String(end) : null,
    };
  }
}

/** `TaskHistory` over the task changes the test sets per tenant. */
export class PagedTaskHistory extends TaskHistory {
  readonly changes = new PagedChanges<TaskChange>();

  override async page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<TaskChange>> {
    return this.changes.page(tenantId, after, limit);
  }
}

/** `InvoiceHistory` over the invoice changes the test sets per tenant. */
export class PagedInvoiceHistory extends InvoiceHistory {
  readonly changes = new PagedChanges<InvoiceChange>();

  override async page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<InvoiceChange>> {
    return this.changes.page(tenantId, after, limit);
  }
}
