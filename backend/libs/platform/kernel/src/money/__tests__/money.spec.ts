import { InvalidMoneyError } from '../invalid-money.error.js';
import { Money } from '../money.js';

describe('Money', () => {
  it('creates a value and compares by value', () => {
    expect(Money.of(150, 'USD').equals(Money.of(150, 'USD'))).toBe(true);
    expect(Money.of(150, 'USD').equals(Money.of(150, 'COP'))).toBe(false);
    expect(Money.zero('USD').amountMinor).toBe(0);
  });

  it('normalizes negative zero', () => {
    expect(Object.is(Money.of(-0, 'USD').amountMinor, 0)).toBe(true);
  });

  it.each([
    ['fraction', 1.5, 'USD'],
    ['out of range', Number.MAX_SAFE_INTEGER + 1, 'USD'],
    ['NaN', NaN, 'USD'],
    ['lowercase currency', 1, 'usd'],
    ['long currency', 1, 'USDT'],
  ])('rejects %s', (_label, amount, currency) => {
    expect(() => Money.of(amount, currency)).toThrow(InvalidMoneyError);
  });

  it('adds, subtracts and compares within one currency', () => {
    const a = Money.of(300, 'USD');
    const b = Money.of(100, 'USD');
    expect(a.add(b).amountMinor).toBe(400);
    expect(a.subtract(b).amountMinor).toBe(200);
    expect(a.compareTo(b)).toBe(1);
    expect(b.compareTo(a)).toBe(-1);
    expect(a.compareTo(a)).toBe(0);
  });

  it('rejects mixing currencies', () => {
    const usd = Money.of(1, 'USD');
    const cop = Money.of(1, 'COP');
    expect(() => usd.add(cop)).toThrow(InvalidMoneyError);
    expect(() => usd.subtract(cop)).toThrow(InvalidMoneyError);
    expect(() => usd.compareTo(cop)).toThrow(InvalidMoneyError);
  });

  it('rejects results out of range', () => {
    expect(() =>
      Money.of(Number.MAX_SAFE_INTEGER, 'USD').add(Money.of(1, 'USD')),
    ).toThrow(InvalidMoneyError);
  });

  it('multiplies by an integer quantity', () => {
    expect(Money.of(250, 'USD').multiply(3).amountMinor).toBe(750);
    expect(() => Money.of(250, 'USD').multiply(1.5)).toThrow(InvalidMoneyError);
  });

  it.each([
    [100, 3, [34, 33, 33]],
    [-100, 3, [-34, -33, -33]],
    [5, 1, [5]],
    [2, 4, [1, 1, 0, 0]],
  ])(
    'allocates %d into %d parts that add up exactly',
    (amount, parts, expected) => {
      const shares = Money.of(amount, 'USD').allocate(parts);
      expect(shares.map((share) => share.amountMinor)).toEqual(expected);
      expect(Money.sum(shares, 'USD').amountMinor).toBe(amount);
    },
  );

  it.each([0, -1, 1.5])('rejects allocating into %d parts', (parts) => {
    expect(() => Money.of(1, 'USD').allocate(parts)).toThrow(InvalidMoneyError);
  });

  it('sums a list, and an empty list gives zero', () => {
    expect(
      Money.sum([Money.of(1, 'USD'), Money.of(2, 'USD')], 'USD').amountMinor,
    ).toBe(3);
    expect(Money.sum([], 'USD').amountMinor).toBe(0);
  });

  it('formats using the currency decimals', () => {
    expect(Money.of(150000, 'USD').format('en-US')).toBe('$1,500.00');
    expect(Money.of(1500, 'JPY').format('en-US')).toBe('¥1,500');
  });

  it('serializes to JSON as plain data', () => {
    expect(JSON.stringify(Money.of(5, 'USD'))).toBe(
      '{"amountMinor":5,"currency":"USD"}',
    );
  });
});
