import { ValueObject } from './value-object.js';

class Money extends ValueObject<{
  amount: number;
  currency: string;
  at?: Date;
  tags: string[];
}> {
  constructor(
    amount: number,
    currency: string,
    at?: Date,
    tags: string[] = [],
  ) {
    super({ amount, currency, at, tags });
  }
}

class Other extends ValueObject<{
  amount: number;
  currency: string;
  at?: Date;
  tags: string[];
}> {
  constructor(amount: number, currency: string) {
    super({ amount, currency, tags: [] });
  }
}

describe('ValueObject', () => {
  it('is equal when props are structurally equal', () => {
    expect(new Money(10, 'EUR').equals(new Money(10, 'EUR'))).toBe(true);
  });

  it('is not equal when any prop differs', () => {
    expect(new Money(10, 'EUR').equals(new Money(11, 'EUR'))).toBe(false);
    expect(new Money(10, 'EUR').equals(new Money(10, 'USD'))).toBe(false);
  });

  it('compares arrays and dates by content', () => {
    const at = new Date('2025-01-01T00:00:00Z');
    expect(
      new Money(1, 'EUR', at, ['a']).equals(
        new Money(1, 'EUR', new Date(at), ['a']),
      ),
    ).toBe(true);
    expect(
      new Money(1, 'EUR', at, ['a']).equals(new Money(1, 'EUR', at, ['b'])),
    ).toBe(false);
    expect(
      new Money(1, 'EUR', at).equals(new Money(1, 'EUR', new Date(0))),
    ).toBe(false);
  });

  it('is not equal to null, undefined, itself-of-other-class, or the same props of another class', () => {
    const money = new Money(10, 'EUR');
    expect(money.equals(null)).toBe(false);
    expect(money.equals(undefined)).toBe(false);
    expect(money.equals(new Other(10, 'EUR') as unknown as Money)).toBe(false);
  });

  it('is equal to itself', () => {
    const money = new Money(10, 'EUR');
    expect(money.equals(money)).toBe(true);
  });

  it('freezes its props', () => {
    const money = new Money(10, 'EUR') as unknown as {
      props: Record<string, unknown>;
    };
    expect(Object.isFrozen(money.props)).toBe(true);
  });
});
