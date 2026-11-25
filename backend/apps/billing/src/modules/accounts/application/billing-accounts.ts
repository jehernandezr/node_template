import { Injectable } from '@nestjs/common';
import {
  BillingErrorCode,
  type BillingAccountClosed,
  type BillingAccountResult,
} from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { InvoicesFacade } from '../../invoices/index.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';

/** A tenant's billing account: opened at tenant signup and closed only if it was never invoiced. */
@Injectable()
export class BillingAccounts {
  constructor(
    private readonly subscriptions: SubscriptionsFacade,
    private readonly invoices: InvoicesFacade,
  ) {}

  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if the trial plan is not in the catalog. */
  async open(tenantId: string): Promise<BillingAccountResult> {
    const { subscription } = await this.subscriptions.open(tenantId);
    return {
      tenantId,
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  /** @throws BillingError `BILLING.INVOICE.INVALID_STATE` if the tenant already has invoices. */
  async close(tenantId: string): Promise<BillingAccountClosed> {
    if (await this.invoices.hasInvoices(tenantId)) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState);
    }
    await this.subscriptions.remove(tenantId);
    return { tenantId };
  }
}
