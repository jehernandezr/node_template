import {
  BillingErrorCode,
  InvoiceFailedEvent,
  InvoicePaidEvent,
  InvoiceStatus,
} from '@contracts/billing';
import { InvoicesHarness } from '../../__tests__/utils/index.js';

const TENANT = InvoicesHarness.TENANT;
const FIRST = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const SECOND = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d02';
const DAY_MS = 86_400_000;

describe('SettleInvoice', () => {
  it('locks the subscription before reading the invoice, so two payments of one tenant never decide on the same stale state', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);

    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    expect(harness.journal.slice(0, 2)).toEqual([
      `lock:${TENANT}`,
      `find:${FIRST}`,
    ]);
  });

  it('marks the invoice paid, announces it and settles the subscription when no invoice remains failed', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);

    const paid = await harness
      .settle()
      .paid(TENANT, FIRST, harness.clock.now());

    expect(paid.status).toBe(InvoiceStatus.Paid);
    expect(harness.bus.types()).toEqual([InvoicePaidEvent.type]);
    expect(harness.journal).toContain(`settle:${TENANT}`);
  });

  it('keeps the subscription past due while another invoice is still failed', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);
    await harness.issue(SECOND);
    await harness.settle().failed(TENANT, SECOND, harness.clock.now(), 1);

    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    expect(harness.journal).not.toContain(`settle:${TENANT}`);
  });

  it('reactivates the tenant once the last failed invoice is paid, whichever payment arrives last', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);
    await harness.issue(SECOND);
    await harness.settle().failed(TENANT, FIRST, harness.clock.now(), 1);
    await harness.settle().failed(TENANT, SECOND, harness.clock.now(), 1);

    await Promise.all([
      harness.settle().paid(TENANT, FIRST, harness.clock.now()),
      harness.settle().paid(TENANT, SECOND, harness.clock.now()),
    ]);

    expect(harness.journal).toContain(`settle:${TENANT}`);
  });

  it('records a rejection with its next retry, announces it and marks the subscription past due', async () => {
    const harness = new InvoicesHarness();
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
    expect(harness.journal).toContain(`past-due:${TENANT}`);
  });

  it('ignores a payment of an invoice already paid', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(FIRST);
    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    await harness.settle().paid(TENANT, FIRST, harness.clock.now());

    expect(harness.bus.types()).toEqual([InvoicePaidEvent.type]);
  });

  it('reports an invoice the tenant does not have', async () => {
    const harness = new InvoicesHarness();

    await expect(
      harness.settle().paid(TENANT, FIRST, harness.clock.now()),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceNotFound });
  });
});
