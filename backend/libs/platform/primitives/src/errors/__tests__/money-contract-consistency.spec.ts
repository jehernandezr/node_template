import { MoneyLimits } from '@contracts/platform';
import { Money } from '@platform/kernel';

describe('Money and the platform contract', () => {
  it('share the amount limit', () => {
    expect(Money.MAX_ABS_AMOUNT_MINOR).toBe(MoneyLimits.maxAbsAmountMinor);
  });

  it('share the currency pattern', () => {
    expect(Money.CURRENCY_PATTERN.source).toBe(
      new RegExp(MoneyLimits.currencyPattern).source,
    );
  });
});
