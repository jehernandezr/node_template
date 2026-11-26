import type { BillingPeriod } from './billing-period.js';

/**
 * Adjustment for a plan change in the middle of a period: the price difference for the fraction of the period that
 * remains from today, in integer minor units and rounded up. A change to a cheaper plan gives a
 * credit (negative).
 */
export class ProrationCalculator {
  /**
   * Computes what the rest of the period costs more or less after a plan change, in minor units.
   * @param fromPriceMinor Price of the plan left.
   * @param toPriceMinor Price of the new plan.
   * @param period Current period.
   * @param today Day of the change.
   * @returns The adjustment, negative for a credit.
   */
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
