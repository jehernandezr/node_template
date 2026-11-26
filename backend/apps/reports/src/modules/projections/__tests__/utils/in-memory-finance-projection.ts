import type { ShardScope } from '@platform/persistence';
import {
  FinanceProjection,
  type DeliveryProjectionChange,
  type InvoiceProjectionChange,
} from '../../domain/finance-projection.js';
import type {
  DeliveryPoint,
  InvoicePoint,
} from '../../domain/projection-points.js';

/** A projected invoice as the table keeps it. */
export interface ProjectedInvoice extends InvoiceProjectionChange {
  readonly tenantId: string;
}

/**
 * In-memory `FinanceProjection` with the merge rules of the table: a status only replaces one of lower progress, so
 * the projection never goes backwards, and each date is kept once known.
 */
export class InMemoryFinanceProjection extends FinanceProjection {
  private readonly invoiceRows = new Map<string, ProjectedInvoice>();
  readonly deliveryRows: DeliveryProjectionChange[] = [];

  constructor(private readonly scope: ShardScope) {
    super();
  }

  override async applyInvoice(change: InvoiceProjectionChange): Promise<void> {
    const tenantId = this.tenantId();
    const key = `${tenantId}:${change.invoiceId}`;
    const current = this.invoiceRows.get(key);
    if (current === undefined) {
      this.invoiceRows.set(key, { ...change, tenantId });
      return;
    }
    const ahead = change.progress > current.progress;
    this.invoiceRows.set(key, {
      ...current,
      status: ahead ? change.status : current.status,
      progress: Math.max(current.progress, change.progress),
      issuedAt: current.issuedAt ?? change.issuedAt,
      paidAt: current.paidAt ?? change.paidAt,
      failedAt: current.failedAt ?? change.failedAt,
    });
  }

  override async applyDelivery(
    change: DeliveryProjectionChange,
  ): Promise<void> {
    this.tenantId();
    if (
      !this.deliveryRows.some(
        (row) => row.notificationId === change.notificationId,
      )
    ) {
      this.deliveryRows.push(change);
    }
  }

  override async invoices(): Promise<readonly InvoicePoint[]> {
    return [];
  }

  override async deliveries(): Promise<readonly DeliveryPoint[]> {
    return [];
  }

  /** The projected invoices of a tenant, as a later read would see them. */
  invoicesOf(tenantId: string): readonly ProjectedInvoice[] {
    return [...this.invoiceRows.values()].filter(
      (row) => row.tenantId === tenantId,
    );
  }

  private tenantId(): string {
    const tenantId = this.scope.current()?.tenantId;
    if (tenantId === undefined) {
      throw new Error('the projection is only used inside a tenant scope');
    }
    return tenantId;
  }
}
