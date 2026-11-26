import { BillingErrorCode, SubscriptionStatus } from '@contracts/billing';
import { InvoicesFacade } from '../../../invoices/index.js';
import { SubscriptionsHarness } from '../../../../__tests__/utils/subscriptions-harness.js';
import { BillingAccounts } from '../billing-accounts.js';

const TENANT = SubscriptionsHarness.TENANT;

class KnownInvoices extends InvoicesFacade {
  invoiced = false;

  override async hasInvoices(): Promise<boolean> {
    return this.invoiced;
  }
}

class AccountsHarness extends SubscriptionsHarness {
  readonly invoices = new KnownInvoices();

  accounts(): BillingAccounts {
    return new BillingAccounts(this.facade(), this.invoices);
  }
}

describe('BillingAccounts', () => {
  it('opens the account of a new tenant on its trial', async () => {
    const harness = new AccountsHarness();

    const opened = await harness.accounts().open(TENANT);

    expect(opened).toEqual({
      tenantId: TENANT,
      subscriptionId: harness.subscriptions.current()?.snapshot().id,
      status: SubscriptionStatus.Trialing,
    });
  });

  it('returns the same account when the signup saga opens it again', async () => {
    const harness = new AccountsHarness();
    const first = await harness.accounts().open(TENANT);

    await expect(harness.accounts().open(TENANT)).resolves.toEqual(first);
  });

  it('closes an account that was never invoiced, deleting its subscription', async () => {
    const harness = new AccountsHarness();
    await harness.accounts().open(TENANT);

    await expect(harness.accounts().close(TENANT)).resolves.toEqual({
      tenantId: TENANT,
    });
    expect(harness.subscriptions.current()).toBeUndefined();
  });

  it('refuses to close an account that was already invoiced and keeps its subscription', async () => {
    const harness = new AccountsHarness();
    await harness.accounts().open(TENANT);
    harness.invoices.invoiced = true;

    await expect(harness.accounts().close(TENANT)).rejects.toMatchObject({
      code: BillingErrorCode.InvoiceInvalidState,
    });
    expect(harness.subscriptions.current()).toBeDefined();
  });
});
