import { InvoiceStatus } from '@contracts/billing';
import { JobContexts } from '@platform/kernel/test-utils';
import {
  PaymentStatus,
  type ChargeRequest,
  type PaymentResult,
} from '../../../payments/index.js';
import {
  InvoicesHarness,
  ScriptedPayments,
} from '../../__tests__/utils/index.js';

const BROKEN = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const HEALTHY = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d02';

class FailingForOneInvoice extends ScriptedPayments {
  constructor(private readonly broken: string) {
    super();
  }

  override async charge(request: ChargeRequest): Promise<PaymentResult> {
    if (request.invoiceId === this.broken) {
      throw new Error('provider unreachable');
    }
    return super.charge(request);
  }
}

class BrokenPaymentsHarness extends InvoicesHarness {
  override readonly payments = new FailingForOneInvoice(BROKEN);
}

describe('CloseInvoicePeriodsJob', () => {
  it('invoices the expired period and charges the new invoice in the same run', async () => {
    const harness = new InvoicesHarness([PaymentStatus.Approved]);
    await harness.subscribe();

    await harness.closingJob().run(JobContexts.live());

    const [invoice] = harness.invoices.all();
    expect(invoice?.snapshot()).toMatchObject({
      periodStart: '2026-11-01',
      status: InvoiceStatus.Paid,
    });
    expect(harness.payments.charges).toHaveLength(1);
  });

  it('neither invoices nor charges twice when it runs again within the day', async () => {
    const harness = new InvoicesHarness([PaymentStatus.Approved]);
    await harness.subscribe();
    await harness.closingJob().run(JobContexts.live());

    await harness.closingJob().run(JobContexts.live());

    expect(harness.invoices.all()).toHaveLength(1);
    expect(harness.payments.charges).toHaveLength(1);
  });

  it('charges the other due invoices when charging one of them fails', async () => {
    const harness = new BrokenPaymentsHarness();
    await harness.issue(BROKEN);
    await harness.issue(HEALTHY);

    await harness.closingJob().run(JobContexts.live());

    expect(harness.invoices.stateOf(BROKEN)?.status).toBe(InvoiceStatus.Issued);
    expect(harness.invoices.stateOf(HEALTHY)?.status).toBe(InvoiceStatus.Paid);
  });

  it('stops before the first tenant once its run was aborted, so another replica can take over', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();

    await expect(
      harness.closingJob().run(JobContexts.aborted()),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(harness.invoices.all()).toEqual([]);
  });
});
