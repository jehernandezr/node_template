import {
  BillingErrorCode,
  Currency,
  InvoiceStatus,
  SubscriptionStatus,
} from '@contracts/billing';
import { PaymentStatus } from '../../../payments/index.js';
import { InvoicesHarness } from '../../__tests__/utils/index.js';

const TENANT = InvoicesHarness.TENANT;
const INVOICE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const TOTAL = { amountMinor: 189_000, currency: Currency.Cop };

describe('RecordPaymentNotice', () => {
  it('records the payment with its reference and settles the invoice and the subscription', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(INVOICE);
    await harness.settle().failed(TENANT, INVOICE, harness.clock.now(), 1);

    const paid = await harness.notices().paid({
      tenantId: TENANT,
      invoiceId: INVOICE,
      paidAt: harness.clock.now(),
      reference: 'gateway-1',
      amount: TOTAL,
    });

    expect(paid.status).toBe(InvoiceStatus.Paid);
    expect(harness.standing()).toBe(SubscriptionStatus.Active);
    expect(harness.attempts.all()).toEqual([
      expect.objectContaining({
        attempt: 2,
        status: PaymentStatus.Approved,
        reference: 'gateway-1',
      }),
    ]);
  });

  it('changes nothing when the provider reports the same payment twice', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(INVOICE);
    const notice = {
      tenantId: TENANT,
      invoiceId: INVOICE,
      paidAt: harness.clock.now(),
      reference: 'gateway-1',
      amount: TOTAL,
    };
    await harness.notices().paid(notice);

    await harness.notices().paid(notice);

    expect(harness.attempts.all()).toHaveLength(1);
    expect(harness.bus.types()).toHaveLength(1);
  });

  it('refuses a payment for an amount other than the total and changes nothing', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(INVOICE);

    await expect(
      harness.notices().paid({
        tenantId: TENANT,
        invoiceId: INVOICE,
        paidAt: harness.clock.now(),
        reference: 'gateway-1',
        amount: { amountMinor: 1, currency: Currency.Cop },
      }),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceAmountMismatch });
    expect(harness.attempts.all()).toEqual([]);
    expect(harness.invoices.stateOf(INVOICE)?.status).toBe(
      InvoiceStatus.Issued,
    );
  });

  it('counts a decline the provider reports twice once, so it does not use up a retry', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issue(INVOICE);
    const notice = {
      tenantId: TENANT,
      invoiceId: INVOICE,
      failedAt: harness.clock.now(),
      reason: 'insufficient funds',
    };
    await harness.notices().failed(notice);

    const again = await harness.notices().failed(notice);

    expect(again.failedAttempts).toBe(1);
    expect(harness.standing()).toBe(SubscriptionStatus.PastDue);
    expect(harness.attempts.all()).toEqual([
      expect.objectContaining({
        attempt: 1,
        status: PaymentStatus.Declined,
        reason: 'insufficient funds',
      }),
    ]);
  });

  it('refuses a late decline of an attempt the provider already approved', async () => {
    const harness = new InvoicesHarness();
    await harness.issue(INVOICE);
    await harness.paymentsModule.facade().charge({
      tenantId: TENANT,
      invoiceId: INVOICE,
      invoiceNumber: 'FAC-000001',
      attempt: 1,
      amountMinor: TOTAL.amountMinor,
      currency: TOTAL.currency,
    });
    const [charged] = harness.attempts.all();

    await expect(
      harness.notices().failed({
        tenantId: TENANT,
        invoiceId: INVOICE,
        attemptId: charged?.id,
        failedAt: harness.clock.now(),
      }),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceInvalidState });
    expect(harness.attempts.all()).toEqual([
      expect.objectContaining({ status: PaymentStatus.Approved }),
    ]);
  });

  it('reports an invoice the tenant does not have', async () => {
    const harness = new InvoicesHarness();

    await expect(
      harness.notices().failed({
        tenantId: TENANT,
        invoiceId: INVOICE,
        failedAt: harness.clock.now(),
      }),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceNotFound });
  });
});
