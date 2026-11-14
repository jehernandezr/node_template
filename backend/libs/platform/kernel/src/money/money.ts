import { InvalidMoneyError } from './invalid-money.error.js';
import { ValueObject } from '../value-object.js';

/** Monto en unidades menores (centavos) y su moneda ISO 4217. */
export class Money extends ValueObject<{
  amountMinor: number;
  currency: string;
}> {
  /** Mayor monto absoluto representable sin pérdida en JavaScript y en Dart web. */
  static readonly MAX_ABS_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

  /** Código de moneda ISO 4217: tres letras mayúsculas. */
  static readonly CURRENCY_PATTERN = /^[A-Z]{3}$/;

  private constructor(amountMinor: number, currency: string) {
    super({ amountMinor, currency });
  }

  /** Crea un monto. Lanza `InvalidMoneyError` si no es entero seguro o la moneda es inválida. */
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
    // Normaliza -0 para que la igualdad y la serialización no distingan los ceros.
    return new Money(amountMinor === 0 ? 0 : amountMinor, currency);
  }

  /** Monto cero en `currency`. */
  static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  /** Suma una lista de montos; la lista vacía da cero en `currency`. */
  static sum(values: readonly Money[], currency: string): Money {
    return values.reduce(
      (total, value) => total.add(value),
      Money.zero(currency),
    );
  }

  get amountMinor(): number {
    return this.props.amountMinor;
  }

  get currency(): string {
    return this.props.currency;
  }

  /** Suma dos montos de la misma moneda. */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor + other.amountMinor, this.currency);
  }

  /** Resta `other` de este monto, de la misma moneda. */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor - other.amountMinor, this.currency);
  }

  /** Multiplica por una cantidad entera, por ejemplo unidades de un ítem. */
  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new InvalidMoneyError('quantity must be an integer');
    }
    return Money.of(this.amountMinor * quantity, this.currency);
  }

  /**
   * Reparte el monto en `parts` partes enteras que suman exactamente el total.
   * Los centavos sobrantes van a las primeras partes.
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

  /** Compara dos montos de la misma moneda: negativo, cero o positivo. */
  compareTo(other: Money): number {
    this.assertSameCurrency(other);
    return Math.sign(this.amountMinor - other.amountMinor);
  }

  /** Formatea para personas en `locale`, por ejemplo `$ 1.500,00`. */
  format(locale: string): string {
    const digits = Money.digitsOf(this.currency);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(this.amountMinor / 10 ** digits);
  }

  toJSON(): { amountMinor: number; currency: string } {
    return { amountMinor: this.amountMinor, currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new InvalidMoneyError('currency mismatch');
    }
  }

  /** Decimales de la moneda según ISO 4217 (2 para USD, 0 para JPY). */
  private static digitsOf(currency: string): number {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  }
}
