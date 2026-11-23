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
import { IdCursors } from '../../../shared/utils/id-cursors.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { InvoiceState } from '../domain/invoice.js';
import { InvoicesFacade } from './invoices.facade.js';
import { InvoiceViews } from './invoice-views.js';

/**
 * Lecturas de las facturas de un tenant: la lista paginada, el detalle, la historia que otro servicio usa
 * para rellenar su copia y si tiene alguna.
 */
@Injectable()
export class InvoiceQueries extends InvoicesFacade {
  private readonly cursors = new IdCursors();

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly shard: TenantShard,
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

  /** @throws BillingError `BILLING.INVOICE.NOT_FOUND` si la factura no es del tenant. */
  get(tenantId: string, invoiceId: string): Promise<Invoice> {
    return this.shard.run(tenantId, async () => {
      const invoice = await this.invoices.find(invoiceId);
      if (invoice === undefined) {
        throw new BillingError(BillingErrorCode.InvoiceNotFound);
      }
      return InvoiceViews.detail(invoice.snapshot());
    });
  }

  hasInvoices(tenantId: string): Promise<boolean> {
    return this.shard.run(tenantId, () => this.invoices.any());
  }

  private page(
    tenantId: string,
    request: ListInvoicesRequest,
  ): Promise<{ items: InvoiceState[]; nextCursor: string | null }> {
    const limit = request.limit ?? BillingDefaults.pageSize;
    return this.shard.run(tenantId, async () => {
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
