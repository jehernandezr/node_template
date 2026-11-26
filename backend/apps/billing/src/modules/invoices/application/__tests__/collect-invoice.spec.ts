import { InvoiceStatus } from '@contracts/billing';
import { PaymentStatus } from '../../../payments/index.js';
import { InvoicesHarness } from '../../__tests__/utils/index.js';

const TENANT = InvoicesHarness.TENANT;
const INVOICE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const DAY_MS = 86_400_000;

describe('CollectInvoice', () => {
  it('charges a due invoice and marks it paid when the provider approves', async () => {
    const harness = new InvoicesHarness([PaymentStatus.Approved]);
    await harness.issue(INVOICE);

    await harness.collect().execute(TENANT, INVOICE);

    expect(harness.payments.charges).toEqual([
      expect.objectContaining({
        invoiceId: INVOICE,
        attempt: 1,
        amountMinor: 189_000,
      }),
    ]);
    expect(harness.invoices.stateOf(INVOICE)?.status).toBe(InvoiceStatus.Paid);
  });

  it('retries a declined invoice on its schedule with the next attempt, and not before', async () => {
    const harness = new InvoicesHarness([
      PaymentStatus.Declined,
      PaymentStatus.Approved,
    ]);
    await harness.issue(INVOICE);
    await harness.collect().execute(TENANT, INVOICE);

    harness.clock.advance(DAY_MS - 1);
    await harness.collect().execute(TENANT, INVOICE);
    expect(harness.payments.charges).toHaveLength(1);

    harness.clock.advance(1);
    await harness.collect().execute(TENANT, INVOICE);

    expect(harness.payments.charges.map((charge) => charge.attempt)).toEqual([
      1, 2,
    ]);
    expect(harness.invoices.stateOf(INVOICE)?.status).toBe(InvoiceStatus.Paid);
  });

  it('stops charging once every retry of the schedule was declined', async () => {
    const harness = new InvoicesHarness([
      PaymentStatus.Declined,
      PaymentStatus.Declined,
      PaymentStatus.Declined,
      PaymentStatus.Declined,
    ]);
    await harness.issue(INVOICE);

    for (let day = 0; day < 15; day++) {
      await harness.collect().execute(TENANT, INVOICE);
      harness.clock.advance(DAY_MS);
    }

    expect(harness.payments.charges).toHaveLength(4);
    expect(harness.invoices.stateOf(INVOICE)).toMatchObject({
      status: InvoiceStatus.Failed,
      failedAttempts: 4,
      nextCollectionAt: undefined,
    });
  });

  it('settles an invoice with nothing to charge without calling the provider', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(INVOICE, 0);

    await harness.collect().execute(TENANT, INVOICE);

    expect(harness.payments.charges).toEqual([]);
    expect(harness.invoices.stateOf(INVOICE)?.status).toBe(InvoiceStatus.Paid);
  });

  it('leaves a pending charge to the notice of the provider', async () => {
    const harness = new InvoicesHarness([PaymentStatus.Pending]);
    await harness.issue(INVOICE);

    await harness.collect().execute(TENANT, INVOICE);

    expect(harness.invoices.stateOf(INVOICE)?.status).toBe(
      InvoiceStatus.Issued,
    );
  });
});
