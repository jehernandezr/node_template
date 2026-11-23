import { PlanPeriodicity } from '@contracts/billing';
import { BillingPeriod } from '../billing-period.js';

describe('BillingPeriod', () => {
  it('ends the day before the same day of the next month', () => {
    const period = BillingPeriod.starting(
      '2026-11-20',
      PlanPeriodicity.Monthly,
    );

    expect([period.start, period.end]).toEqual(['2026-11-20', '2026-12-19']);
    expect(period.days()).toBe(30);
  });

  it('ends the day before the last day of a shorter month when the start day does not exist there', () => {
    const period = BillingPeriod.starting(
      '2026-01-31',
      PlanPeriodicity.Monthly,
    );

    expect(period.end).toBe('2026-02-27');
  });

  it('keeps the shorter day as the anchor of the following periods', () => {
    const january = BillingPeriod.starting(
      '2026-01-31',
      PlanPeriodicity.Monthly,
    );
    const february = january.next(PlanPeriodicity.Monthly);
    const march = february.next(PlanPeriodicity.Monthly);

    expect([february.start, february.end]).toEqual([
      '2026-02-28',
      '2026-03-27',
    ]);
    expect([march.start, march.end]).toEqual(['2026-03-28', '2026-04-27']);
  });

  it('lasts a year for an annual plan', () => {
    expect(
      BillingPeriod.starting('2026-03-01', PlanPeriodicity.Annual).end,
    ).toBe('2027-02-28');
  });

  it('starts the next period the day after the end', () => {
    const next = BillingPeriod.of('2026-11-01', '2026-11-30').next(
      PlanPeriodicity.Monthly,
    );

    expect([next.start, next.end]).toEqual(['2026-12-01', '2026-12-31']);
  });

  it('counts the remaining days including today and none once it ended', () => {
    const period = BillingPeriod.of('2026-11-01', '2026-11-30');

    expect(period.remainingFrom('2026-11-21')).toBe(10);
    expect(period.remainingFrom('2026-12-02')).toBe(0);
    expect(period.hasEndedBy('2026-11-30')).toBe(false);
    expect(period.hasEndedBy('2026-12-01')).toBe(true);
  });

  it('covers a given number of days for a trial', () => {
    expect(BillingPeriod.ofDays('2026-11-20', 14).end).toBe('2026-12-03');
  });
});
