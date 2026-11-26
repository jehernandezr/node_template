import { Currency, InvoiceStatus } from '@contracts/billing';
import {
  NotificationChannel,
  NotificationType,
} from '@contracts/notifications';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { InMemoryFinanceProjection } from '../../__tests__/utils/index.js';
import { ProjectFinanceEvents } from '../project-finance-events.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const INVOICE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const TOTAL = { amountMinor: 189_000, currency: Currency.Cop };

class FinanceEventsHarness {
  private readonly unrouted = new UnroutedShardScopes();
  readonly projection = new InMemoryFinanceProjection(this.unrouted.scope);
  readonly events = new ProjectFinanceEvents(
    this.projection,
    this.unrouted.scopes,
    new InMemoryTransactionManager(),
  );

  issued(): Promise<void> {
    return this.events.invoiceIssued({
      tenantId: TENANT,
      invoiceId: INVOICE,
      number: 'FAC-000001',
      period: { start: '2026-11-01', end: '2026-11-30' },
      total: TOTAL,
      issuedAt: '2026-12-01T00:05:00.000Z',
    });
  }

  failed(): Promise<void> {
    return this.events.invoiceFailed({
      tenantId: TENANT,
      invoiceId: INVOICE,
      number: 'FAC-000001',
      total: TOTAL,
      attempts: 1,
      failedAt: '2026-12-01T00:06:00.000Z',
    });
  }

  paid(): Promise<void> {
    return this.events.invoicePaid({
      tenantId: TENANT,
      invoiceId: INVOICE,
      number: 'FAC-000001',
      total: TOTAL,
      paidAt: '2026-12-02T08:00:00.000Z',
    });
  }

  invoice() {
    return this.projection.invoicesOf(TENANT)[0];
  }
}

describe('ProjectFinanceEvents', () => {
  it('follows an invoice from issued through failed to paid, keeping each date', async () => {
    const harness = new FinanceEventsHarness();

    await harness.issued();
    await harness.failed();
    await harness.paid();

    expect(harness.invoice()).toMatchObject({
      status: InvoiceStatus.Paid,
      totalMinor: TOTAL.amountMinor,
      currency: Currency.Cop,
      issuedAt: new Date('2026-12-01T00:05:00.000Z'),
      failedAt: new Date('2026-12-01T00:06:00.000Z'),
      paidAt: new Date('2026-12-02T08:00:00.000Z'),
    });
  });

  it('never moves a paid invoice back when an older event arrives late', async () => {
    const harness = new FinanceEventsHarness();
    await harness.paid();

    await harness.failed();
    await harness.issued();

    expect(harness.invoice()).toMatchObject({
      status: InvoiceStatus.Paid,
      issuedAt: new Date('2026-12-01T00:05:00.000Z'),
    });
  });

  it('projects a notification once with the channels it went out through', async () => {
    const harness = new FinanceEventsHarness();
    const created = {
      notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e01',
      tenantId: TENANT,
      type: NotificationType.InvoiceIssued,
      channels: [NotificationChannel.InApp, NotificationChannel.Email],
      createdAt: '2026-12-01T00:05:00.000Z',
    };

    await harness.events.notificationCreated(created);
    await harness.events.notificationCreated(created);

    expect(harness.projection.deliveryRows).toEqual([
      expect.objectContaining({
        type: NotificationType.InvoiceIssued,
        channels: [NotificationChannel.InApp, NotificationChannel.Email],
      }),
    ]);
  });
});
