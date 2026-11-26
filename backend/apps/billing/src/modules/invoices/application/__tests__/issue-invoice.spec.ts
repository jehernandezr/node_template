import {
  InvoiceIssuedEvent,
  InvoiceLineKind,
  InvoiceStatus,
} from '@contracts/billing';
import { CatalogPlans } from '../../../../__tests__/utils/catalog-plans.js';
import { InvoicesHarness } from '../../__tests__/utils/index.js';

const TENANT = InvoicesHarness.TENANT;
const TODAY = '2026-12-01';

describe('IssueInvoice', () => {
  it('closes the expired period and issues its invoice with the plan fee and the next number of the series', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();

    const issued = await harness.issueInvoice().execute(TENANT, TODAY);

    expect(issued).toMatchObject({
      number: 'FAC-000001',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      status: InvoiceStatus.Issued,
      totalMinor: CatalogPlans.BASIC.priceMinor,
      lines: [
        expect.objectContaining({
          kind: InvoiceLineKind.FixedFee,
          amountMinor: CatalogPlans.BASIC.priceMinor,
        }),
      ],
    });
    expect(harness.invoices.stateOf(String(issued?.id))).toEqual(issued);
    expect(harness.bus.types()).toContain(InvoiceIssuedEvent.type);
    expect(
      harness.subscriptionsModule.subscriptions.current()?.snapshot().period,
    ).toMatchObject({ start: TODAY });
  });

  it('issues nothing when the job runs again the same day, so a period is never invoiced twice', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();
    await harness.issueInvoice().execute(TENANT, TODAY);

    await expect(
      harness.issueInvoice().execute(TENANT, TODAY),
    ).resolves.toBeUndefined();
    expect(harness.invoices.all()).toHaveLength(1);
  });

  it('numbers the invoices of consecutive periods without gaps', async () => {
    const harness = new InvoicesHarness();
    await harness.subscribe();

    const first = await harness.issueInvoice().execute(TENANT, TODAY);
    const second = await harness.issueInvoice().execute(TENANT, '2027-01-01');

    expect([first?.number, second?.number]).toEqual([
      'FAC-000001',
      'FAC-000002',
    ]);
  });

  it('activates an ending trial without issuing an invoice', async () => {
    const harness = new InvoicesHarness();
    await harness.subscriptionsModule.open().execute(TENANT);
    harness.bus.messages.splice(0);

    const issued = await harness.issueInvoice().execute(TENANT, '2026-12-16');

    expect(issued).toBeUndefined();
    expect(harness.invoices.all()).toEqual([]);
    expect(harness.bus.types()).not.toContain(InvoiceIssuedEvent.type);
  });
});
