import { MoneyAmountSchema } from '@contracts/platform';
import {
  addMoney,
  allocateMoney,
  compareMoney,
  currencyDigits,
  formatMoney,
  money,
  multiplyMoney,
  subtractMoney,
  sumMoney,
} from './money.js';

describe('money', () => {
  it('creates values that satisfy the contract schema', () => {
    expect(MoneyAmountSchema.parse(money(1500, 'COP'))).toEqual({
      amountMinor: 1500,
      currency: 'COP',
    });
  });

  it('rejects fractional or unsafe amounts and bad currencies', () => {
    expect(() => money(1.5, 'COP')).toThrow(RangeError);
    expect(() => money(Number.MAX_SAFE_INTEGER + 2, 'COP')).toThrow(RangeError);
    expect(() => money(1, 'cop')).toThrow(/Moneda/);
  });

  it('adds, subtracts, multiplies and sums in minor units', () => {
    const a = money(1050, 'USD');
    const b = money(250, 'USD');
    expect(addMoney(a, b).amountMinor).toBe(1300);
    expect(subtractMoney(b, a).amountMinor).toBe(-800);
    expect(multiplyMoney(a, 3).amountMinor).toBe(3150);
    expect(sumMoney([a, b, b], 'USD').amountMinor).toBe(1550);
    expect(sumMoney([], 'USD')).toEqual(money(0, 'USD'));
    expect(() => multiplyMoney(a, 1.5)).toThrow(/entera/);
  });

  it('never mixes currencies', () => {
    expect(() => addMoney(money(1, 'USD'), money(1, 'COP'))).toThrow(
      /combinar/,
    );
    expect(() => compareMoney(money(1, 'USD'), money(1, 'COP'))).toThrow();
  });

  it('allocates without losing cents', () => {
    expect(
      allocateMoney(money(100, 'USD'), 3).map((m) => m.amountMinor),
    ).toEqual([34, 33, 33]);
    expect(
      allocateMoney(money(-5, 'USD'), 2).map((m) => m.amountMinor),
    ).toEqual([-3, -2]);
    expect(() => allocateMoney(money(1, 'USD'), 0)).toThrow(/Partes/);
  });

  it('compares values', () => {
    expect(compareMoney(money(1, 'USD'), money(2, 'USD'))).toBe(-1);
    expect(compareMoney(money(2, 'USD'), money(2, 'USD'))).toBe(0);
  });

  it('formats with the currency digits', () => {
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
    expect(formatMoney(money(123456, 'USD'), 'en-US')).toBe('$1,234.56');
    expect(formatMoney(money(500, 'JPY'), 'en-US')).toBe('¥500');
  });
});
