import { IdCursor } from '@platform/criteria';
import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  BillingErrorCode,
  type Invoice,
  type InvoiceChangePage,
  type InvoicePage,
  type ListInvoiceChangesInput,
  type ListInvoicesRequest,
} from '@contracts/billing';
import { BillingDefaults } from '../../../shared/constants/billing-defaults.constants.js';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { InvoiceState } from '../domain/invoice.js';
import { InvoicesFacade } from './invoices.facade.js';
import { InvoiceViews } from './invoice-views.js';

/**
 * Reads of a tenant's invoices: the paginated list, the detail, the history another service uses
 * to backfill its copy, and whether it has any.
 */
@Injectable()
export class InvoiceQueries extends InvoicesFacade {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly shard: ShardScopes,
    private readonly cursors: IdCursor,
  ) {
    super();
  }

  async list(
    tenantId: string,
    request: ListInvoicesRequest,
  ): Promise<InvoicePage> {
    const page = await this.page(tenantId, request);
    return {
      items: page.items.map((state) => InvoiceViews.summary(state)),
      nextCursor: page.nextCursor,
    };
  }

  async changes(input: ListInvoiceChangesInput): Promise<InvoiceChangePage> {
    const page = await this.page(input.tenantId, input);
    return {
      items: page.items.map((state) => InvoiceViews.change(state)),
      nextCursor: page.nextCursor,
    };
  }

  /** @throws BillingError `BILLING.INVOICE.NOT_FOUND` if the invoice does not belong to the tenant. */
  get(tenantId: string, invoiceId: string): Promise<Invoice> {
    return this.shard.inTenantShard(tenantId, async () => {
      const invoice = await this.invoices.find(invoiceId);
      if (invoice === undefined) {
        throw new BillingError(BillingErrorCode.InvoiceNotFound);
      }
      return InvoiceViews.detail(invoice.snapshot());
    });
  }

  override hasInvoices(tenantId: string): Promise<boolean> {
    return this.shard.inTenantShard(tenantId, () => this.invoices.any());
  }

  private page(
    tenantId: string,
    request: ListInvoicesRequest,
  ): Promise<{ items: InvoiceState[]; nextCursor: string | null }> {
    const limit = request.limit ?? BillingDefaults.pageSize;
    return this.shard.inTenantShard(tenantId, async () => {
      const page = await this.invoices.page({
        status: request.status,
        afterId: this.cursors.idOf(request.after),
        limit: limit + 1,
      });
      const items = page.slice(0, limit).map((invoice) => invoice.snapshot());
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          page.length > limit && last !== undefined
            ? this.cursors.after(last.id)
            : null,
      };
    });
  }
}
