import {
  BillingErrorCode,
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
} from '@contracts/billing';
import { CollectionRetrySchedule } from '../collection-retry-schedule.js';
import { Invoice } from '../invoice.js';

const ISSUED_AT = new Date('2026-12-01T00:00:00.000Z');
const RETRIES = new CollectionRetrySchedule([1, 3]);
const day = (n: number) => new Date(ISSUED_AT.getTime() + n * 86_400_000);

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
    now: ISSUED_AT,
  });

describe('Invoice', () => {
  it('is issued with the sum of its lines as total', () => {
    expect(issued().snapshot()).toMatchObject({
      status: InvoiceStatus.Issued,
      totalMinor: 179_000,
    });
  });

  it('is due for collection as soon as it is issued', () => {
    const invoice = issued();

    expect(invoice.isDueForCollection(ISSUED_AT)).toBe(true);
    expect(invoice.collectionAttempt()).toBe(1);
  });

  it('counts the decline of an attempt once, however many times it is reported', () => {
    const invoice = issued();

    expect(invoice.fail(day(0), 1, RETRIES)).toBe(true);
    expect(invoice.fail(day(0), 1, RETRIES)).toBe(false);
    expect(invoice.snapshot()).toMatchObject({
      status: InvoiceStatus.Failed,
      failedAttempts: 1,
    });
  });

  it('retries a declined invoice on the schedule and stops when it runs out', () => {
    const invoice = issued();

    invoice.fail(day(0), 1, RETRIES);
    const beforeRetry = invoice.isDueForCollection(day(0.5));
    const onRetry = invoice.isDueForCollection(day(1));
    invoice.fail(day(1), invoice.collectionAttempt(), RETRIES);
    const second = invoice.snapshot().nextCollectionAt;
    invoice.fail(day(4), invoice.collectionAttempt(), RETRIES);

    expect(beforeRetry).toBe(false);
    expect(onRetry).toBe(true);
    expect(second).toEqual(day(4));
    expect(invoice.snapshot().failedAttempts).toBe(3);
    expect(invoice.isDueForCollection(day(365))).toBe(false);
  });

  it('is paid after failing, and paying again changes nothing', () => {
    const invoice = issued();
    invoice.fail(day(0), 1, RETRIES);

    expect(invoice.pay(new Date('2026-12-05T00:00:00.000Z'))).toBe(true);
    expect(invoice.pay(new Date('2026-12-06T00:00:00.000Z'))).toBe(false);
    expect(invoice.snapshot()).toMatchObject({
      status: InvoiceStatus.Paid,
      paidAt: new Date('2026-12-05T00:00:00.000Z'),
    });
    expect(invoice.isDueForCollection(day(30))).toBe(false);
  });

  it('refuses to fail once paid', () => {
    const invoice = issued();
    invoice.pay(new Date('2026-12-05T00:00:00.000Z'));

    expect(() => invoice.fail(day(5), 1, RETRIES)).toThrow(
      expect.objectContaining({ code: BillingErrorCode.InvoiceInvalidState }),
    );
  });

  it('accepts a payment for exactly its total in its currency', () => {
    expect(() =>
      issued().assertTotal({ amountMinor: 179_000, currency: Currency.Cop }),
    ).not.toThrow();
  });

  it.each([
    [{ amountMinor: 178_999, currency: Currency.Cop }],
    [{ amountMinor: 179_000, currency: Currency.Usd }],
  ])('refuses a payment of %o', (amount) => {
    expect(() => issued().assertTotal(amount)).toThrow(
      expect.objectContaining({
        code: BillingErrorCode.InvoiceAmountMismatch,
      }),
    );
  });
});
