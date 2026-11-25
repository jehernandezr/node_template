import { PlanPeriodicity } from '@contracts/billing';

/**
 * Billing period in calendar dates (`YYYY-MM-DD`), with start and end inclusive. A monthly
 * period ends the day before the same day of the next month; if that month does not have the day (a start on the 31st
 * before February), the next one starts on the last day of that month and the periods stay anchored from
 * then on to that day, without returning to the 31st.
 */
export class BillingPeriod {
  private static readonly DAY_MS = 86_400_000;

  private constructor(
    readonly start: string,
    readonly end: string,
  ) {}

  static of(start: string, end: string): BillingPeriod {
    return new BillingPeriod(start, end);
  }

  /** The `days`-day period that starts on `start`. */
  static ofDays(start: string, days: number): BillingPeriod {
    return new BillingPeriod(start, BillingPeriod.plusDays(start, days - 1));
  }

  static starting(start: string, periodicity: PlanPeriodicity): BillingPeriod {
    const months = periodicity === PlanPeriodicity.Annual ? 12 : 1;
    const [year = 0, month = 1, day = 1] = start.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    const next = BillingPeriod.format(target);
    return new BillingPeriod(start, BillingPeriod.plusDays(next, -1));
  }

  /** Returns the UTC calendar date of an instant. */
  static dateOf(instant: Date): string {
    return BillingPeriod.format(instant);
  }

  next(periodicity: PlanPeriodicity): BillingPeriod {
    return BillingPeriod.starting(
      BillingPeriod.plusDays(this.end, 1),
      periodicity,
    );
  }

  /** The same period ended the day before `day`, which must fall after the start. */
  endingBefore(day: string): BillingPeriod {
    return new BillingPeriod(this.start, BillingPeriod.plusDays(day, -1));
  }

  days(): number {
    return BillingPeriod.daysBetween(this.start, this.end) + 1;
  }

  /** Days remaining from `today` to the end, both inclusive; zero if it already ended. */
  remainingFrom(today: string): number {
    return Math.max(0, BillingPeriod.daysBetween(today, this.end) + 1);
  }

  hasEndedBy(today: string): boolean {
    return today > this.end;
  }

  private static plusDays(date: string, days: number): string {
    return BillingPeriod.format(
      new Date(
        Date.parse(`${date}T00:00:00.000Z`) + days * BillingPeriod.DAY_MS,
      ),
    );
  }

  private static daysBetween(from: string, to: string): number {
    return Math.round(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        BillingPeriod.DAY_MS,
    );
  }

  private static format(instant: Date): string {
    return instant.toISOString().slice(0, 10);
  }
}
