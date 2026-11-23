import {
  BillingErrorCode,
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
} from '@contracts/billing';
import { Invoice } from '../invoice.js';

const issued = () =>
  Invoice.issue({
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
    number: 'FAC-000001',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    currency: Currency.Cop,
    lines: [
      {
        kind: InvoiceLineKind.FixedFee,
        description: 'Plan Pro',
        amountMinor: 189_000,
      },
      {
        kind: InvoiceLineKind.FixedFee,
        description: 'Ajuste',
        amountMinor: -10_000,
      },
    ],
    now: new Date('2026-12-01T00:00:00.000Z'),
  });

describe('Invoice', () => {
  it('is issued with the sum of its lines as total', () => {
    expect(issued().snapshot()).toMatchObject({
      status: InvoiceStatus.Issued,
      totalMinor: 179_000,
    });
  });

  it('counts each failed collection once until it fails again after being issued', () => {
    const invoice = issued();

    expect(invoice.fail()).toBe(true);
    expect(invoice.fail()).toBe(false);
    expect(invoice.snapshot()).toMatchObject({
      status: InvoiceStatus.Failed,
      failedAttempts: 1,
    });
  });

  it('is paid after failing, and paying again changes nothing', () => {
    const invoice = issued();
    invoice.fail();

    expect(invoice.pay(new Date('2026-12-05T00:00:00.000Z'))).toBe(true);
    expect(invoice.pay(new Date('2026-12-06T00:00:00.000Z'))).toBe(false);
    expect(invoice.snapshot()).toMatchObject({
      status: InvoiceStatus.Paid,
      paidAt: new Date('2026-12-05T00:00:00.000Z'),
    });
  });

  it('refuses to fail once paid', () => {
    const invoice = issued();
    invoice.pay(new Date('2026-12-05T00:00:00.000Z'));

    expect(() => invoice.fail()).toThrow(
      expect.objectContaining({ code: BillingErrorCode.InvoiceInvalidState }),
    );
  });
});
