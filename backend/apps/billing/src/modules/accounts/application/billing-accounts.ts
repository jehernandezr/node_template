import { Injectable } from '@nestjs/common';
import {
  BillingErrorCode,
  type BillingAccountClosed,
  type BillingAccountResult,
} from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { InvoicesFacade } from '../../invoices/index.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';

/** La cuenta de facturación de un tenant: se abre con su alta y solo se cierra si nunca se le facturó. */
@Injectable()
export class BillingAccounts {
  constructor(
    private readonly subscriptions: SubscriptionsFacade,
    private readonly invoices: InvoicesFacade,
  ) {}

  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` si el plan de prueba no está en el catálogo. */
  async open(tenantId: string): Promise<BillingAccountResult> {
    const { subscription } = await this.subscriptions.open(tenantId);
    return {
      tenantId,
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  /** @throws BillingError `BILLING.INVOICE.INVALID_STATE` si el tenant ya tiene facturas. */
  async close(tenantId: string): Promise<BillingAccountClosed> {
    if (await this.invoices.hasInvoices(tenantId)) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState);
    }
    await this.subscriptions.remove(tenantId);
    return { tenantId };
  }
}
