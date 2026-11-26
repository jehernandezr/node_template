import { InvalidMoneyError } from './invalid-money.error.js';
import { ValueObject } from '../value-object.js';

/** Amount in minor units (cents) and its ISO 4217 currency. */
export class Money extends ValueObject<{
  amountMinor: number;
  currency: string;
}> {
  /** Largest absolute amount representable without loss in JavaScript and in Dart web. */
  static readonly MAX_ABS_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

  /** ISO 4217 currency code: three uppercase letters. */
  static readonly CURRENCY_PATTERN = /^[A-Z]{3}$/;

  private constructor(amountMinor: number, currency: string) {
    super({ amountMinor, currency });
  }

  /**
   * Creates an amount. Throws `InvalidMoneyError` if it is not a safe integer or the currency is invalid.
   * Normalizes -0 so equality and serialization do not tell the zeros apart.
   * @param amountMinor Amount in minor units.
   * @param currency ISO 4217 code.
   * @returns The amount.
   */
  static of(amountMinor: number, currency: string): Money {
    if (!Money.CURRENCY_PATTERN.test(currency)) {
      throw new InvalidMoneyError('invalid currency');
    }
    if (
      !Number.isInteger(amountMinor) ||
      Math.abs(amountMinor) > Money.MAX_ABS_AMOUNT_MINOR
    ) {
      throw new InvalidMoneyError('amount out of range');
    }
    return new Money(amountMinor === 0 ? 0 : amountMinor, currency);
  }

  /**
   * Zero amount in `currency`.
   * @param currency ISO 4217 code.
   * @returns The zero amount.
   */
  static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  /**
   * Sums a list of amounts; the empty list gives zero in `currency`.
   * @param values Amounts to sum.
   * @param currency Currency of the result.
   * @returns The sum.
   */
  static sum(values: readonly Money[], currency: string): Money {
    return values.reduce(
      (total, value) => total.add(value),
      Money.zero(currency),
    );
  }

  /** Amount in minor units. */
  get amountMinor(): number {
    return this.props.amountMinor;
  }

  /** ISO 4217 currency code. */
  get currency(): string {
    return this.props.currency;
  }

  /**
   * Adds two amounts of the same currency.
   * @param other Amount to add.
   * @returns The sum.
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor + other.amountMinor, this.currency);
  }

  /**
   * Subtracts `other` from this amount, of the same currency.
   * @param other Amount to subtract.
   * @returns The difference.
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor - other.amountMinor, this.currency);
  }

  /**
   * Multiplies by an integer quantity, for example units of an item.
   * @param quantity Integer factor.
   * @returns The product.
   */
  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new InvalidMoneyError('quantity must be an integer');
    }
    return Money.of(this.amountMinor * quantity, this.currency);
  }

  /**
   * Splits the amount into `parts` integer parts that add up exactly to the total.
   * The leftover cents go to the first parts.
   * @param parts Number of parts.
   * @returns The parts.
   */
  allocate(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) {
      throw new InvalidMoneyError('parts must be a positive integer');
    }
    const sign = this.amountMinor < 0 ? -1 : 1;
    const total = Math.abs(this.amountMinor);
    const base = Math.floor(total / parts);
    const remainder = total - base * parts;
    return Array.from({ length: parts }, (_, index) =>
      Money.of(sign * (base + (index < remainder ? 1 : 0)), this.currency),
    );
  }

  /**
   * Compares two amounts of the same currency: negative, zero or positive.
   * @param other Amount to compare.
   * @returns The comparison.
   */
  compareTo(other: Money): number {
    this.assertSameCurrency(other);
    return Math.sign(this.amountMinor - other.amountMinor);
  }

  /**
   * Formats for people in `locale`, for example `$ 1.500,00`.
   * @param locale BCP 47 locale.
   * @returns The formatted amount.
   */
  format(locale: string): string {
    const digits = Money.digitsOf(this.currency);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(this.amountMinor / 10 ** digits);
  }

  /**
   * Serializes the amount with its currency.
   * @returns The JSON value.
   */
  toJSON(): { amountMinor: number; currency: string } {
    return { amountMinor: this.amountMinor, currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new InvalidMoneyError('currency mismatch');
    }
  }

  /** Returns the currency decimals according to ISO 4217 (2 for USD, 0 for JPY). */
  private static digitsOf(currency: string): number {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  }
}
