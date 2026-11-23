import { BillingPeriod } from '../billing-period.js';
import { ProrationCalculator } from '../proration-calculator.js';

const NOVEMBER = BillingPeriod.of('2026-11-01', '2026-11-30');

describe('ProrationCalculator', () => {
  it('charges the price difference for the rest of the period, rounded up', () => {
    expect(
      ProrationCalculator.adjustment(49_900, 189_000, NOVEMBER, '2026-11-21'),
    ).toBe(46_367);
  });

  it('credits a cheaper plan for the rest of the period', () => {
    expect(
      ProrationCalculator.adjustment(189_000, 49_900, NOVEMBER, '2026-11-21'),
    ).toBe(-46_366);
  });

  it('adjusts nothing once the period ended', () => {
    expect(
      ProrationCalculator.adjustment(49_900, 189_000, NOVEMBER, '2026-12-05'),
    ).toBe(0);
  });
});
