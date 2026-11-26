import {
  BillingErrorCode,
  InvoiceFailedEvent,
  InvoicePaidEvent,
  InvoiceStatus,
  SubscriptionStatus,
} from '@contracts/billing';
import { InvoicesHarness } from '../../__tests__/utils/index.js';

const TENANT = InvoicesHarness.TENANT;
const FIRST = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const SECOND = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d02';
const DAY_MS = 86_400_000;

describe('SettleInvoice', () => {
  it('marks the invoice paid and announces it', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(FIRST);

    const paid = await harness
      .settle()
      .paid(TENANT, FIRST, harness.clock.now());

    expect(paid.status).toBe(InvoiceStatus.Paid);
    expect(harness.invoices.stateOf(FIRST)?.status).toBe(InvoiceStatus.Paid);
    expect(harness.bus.types()).toEqual([InvoicePaidEvent.type]);
    expect(harness.standing()).toBe(SubscriptionStatus.Active);
  });

  it('records a rejection with its next retry, announces it and leaves the subscription past due', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(FIRST);

    const failed = await harness
      .settle()
      .failed(TENANT, FIRST, harness.clock.now(), 1);

    expect(failed).toMatchObject({
      status: InvoiceStatus.Failed,
      failedAttempts: 1,
      nextCollectionAt: new Date(harness.clock.now().getTime() + DAY_MS),
    });
    expect(harness.bus.types()).toEqual([InvoiceFailedEvent.type]);
    expect(harness.standing()).toBe(SubscriptionStatus.PastDue);
  });

  it('keeps the subscription past due while another invoice is still failed', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(FIRST);
    await harness.issue(SECOND);
    await harness.settle().failed(TENANT, FIRST, harness.clock.now(), 1);
    await harness.settle().failed(TENANT, SECOND, harness.clock.now(), 1);

    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    expect(harness.standing()).toBe(SubscriptionStatus.PastDue);
  });

  it('reactivates the subscription once the last failed invoice is paid', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(FIRST);
    await harness.issue(SECOND);
    await harness.settle().failed(TENANT, FIRST, harness.clock.now(), 1);
    await harness.settle().failed(TENANT, SECOND, harness.clock.now(), 1);
    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    await harness.settle().paid(TENANT, SECOND, harness.clock.now());

    expect(harness.standing()).toBe(SubscriptionStatus.Active);
  });

  it('ignores a payment of an invoice already paid', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);
    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    expect(harness.bus.types()).toEqual([InvoicePaidEvent.type]);
  });

  it('ignores a rejection repeated for the same attempt, so it does not use up a retry', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);
    await harness.settle().failed(TENANT, FIRST, harness.clock.now(), 1);

    const again = await harness
      .settle()
      .failed(TENANT, FIRST, harness.clock.now(), 1);

    expect(again.failedAttempts).toBe(1);
    expect(harness.bus.types()).toEqual([InvoiceFailedEvent.type]);
  });

  it('reports an invoice the tenant does not have', async () => {
    const harness = new InvoicesHarness();

    await expect(
      harness.settle().paid(TENANT, FIRST, harness.clock.now()),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceNotFound });
  });
});
