import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  type Currency,
  type InvoiceFailedPayload,
  type InvoiceIssuedPayload,
  type InvoicePaidPayload,
} from '@contracts/billing';
import type { NotificationCreatedPayload } from '@contracts/notifications';
import { TransactionManager } from '@platform/kernel';
import {
  FinanceProjection,
  InvoiceProgress,
  type InvoiceProjectionChange,
} from '../domain/finance-projection.js';

/** Brings billing and notifications events into the projections of their tenant's shard. */
@Injectable()
export class ProjectFinanceEvents {
  constructor(
    private readonly projection: FinanceProjection,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  invoiceIssued(event: InvoiceIssuedPayload): Promise<void> {
    return this.invoice(event.tenantId, {
      invoiceId: event.invoiceId,
      status: InvoiceStatus.Issued,
      number: event.number,
      currency: event.total.currency as Currency,
      totalMinor: event.total.amountMinor,
      issuedAt: new Date(event.issuedAt),
    });
  }

  invoicePaid(event: InvoicePaidPayload): Promise<void> {
    return this.invoice(event.tenantId, {
      invoiceId: event.invoiceId,
      status: InvoiceStatus.Paid,
      number: event.number,
      currency: event.total.currency as Currency,
      totalMinor: event.total.amountMinor,
      paidAt: new Date(event.paidAt),
    });
  }

  invoiceFailed(event: InvoiceFailedPayload): Promise<void> {
    return this.invoice(event.tenantId, {
      invoiceId: event.invoiceId,
      status: InvoiceStatus.Failed,
      number: event.number,
      currency: event.total.currency as Currency,
      totalMinor: event.total.amountMinor,
      failedAt: new Date(event.failedAt),
    });
  }

  notificationCreated(event: NotificationCreatedPayload): Promise<void> {
    return this.shard.inTenantShard(event.tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.projection.applyDelivery({
          notificationId: event.notificationId,
          type: event.type,
          channels: event.channels,
          createdAt: new Date(event.createdAt),
        }),
      ),
    );
  }

  private invoice(
    tenantId: string,
    change: Omit<InvoiceProjectionChange, 'progress'>,
  ): Promise<void> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.projection.applyInvoice({
          ...change,
          progress: InvoiceProgress.rankOf(change.status),
        }),
      ),
    );
  }
}
