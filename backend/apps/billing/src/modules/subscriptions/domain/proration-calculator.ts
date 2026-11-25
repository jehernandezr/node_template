import type { BillingPeriod } from './billing-period.js';

/**
 * Adjustment for a plan change in the middle of a period: the price difference for the fraction of the period that
 * remains from today, in integer minor units and rounded up. A change to a cheaper plan gives a
 * credit (negative).
 */
export class ProrationCalculator {
  static adjustment(
    fromPriceMinor: number,
    toPriceMinor: number,
    period: BillingPeriod,
    today: string,
  ): number {
    const remaining = period.remainingFrom(today);
    return Math.ceil(
      ((toPriceMinor - fromPriceMinor) * remaining) / period.days(),
    );
  }
}
