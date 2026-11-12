import { MoneyLimits, type MoneyAmount } from '@contracts/platform';

const CURRENCY = new RegExp(MoneyLimits.currencyPattern);

function checkAmount(amountMinor: number): number {
  if (
    !Number.isInteger(amountMinor) ||
    Math.abs(amountMinor) > MoneyLimits.maxAbsAmountMinor
  ) {
    throw new RangeError(`Monto fuera de rango: ${amountMinor}`);
  }
  return amountMinor;
}

/** Crea un monto en unidades menores. Lanza `RangeError` si no es entero seguro o la moneda es inválida. */
export function money(amountMinor: number, currency: string): MoneyAmount {
  if (!CURRENCY.test(currency)) {
    throw new RangeError(`Moneda inválida: ${currency}`);
  }
  return Object.freeze({ amountMinor: checkAmount(amountMinor), currency });
}

function sameCurrency(a: MoneyAmount, b: MoneyAmount): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`No se pueden combinar ${a.currency} y ${b.currency}`);
  }
}

/** Suma dos montos de la misma moneda. */
export function addMoney(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  sameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

/** Resta `b` de `a`, de la misma moneda. */
export function subtractMoney(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  sameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

/** Multiplica un monto por una cantidad entera, por ejemplo unidades de un ítem. */
export function multiplyMoney(
  value: MoneyAmount,
  quantity: number,
): MoneyAmount {
  if (!Number.isInteger(quantity)) {
    throw new RangeError(`La cantidad debe ser entera: ${quantity}`);
  }
  return money(value.amountMinor * quantity, value.currency);
}

/** Suma una lista de montos; la lista vacía da cero en `currency`. */
export function sumMoney(
  values: readonly MoneyAmount[],
  currency: string,
): MoneyAmount {
  return values.reduce(addMoney, money(0, currency));
}

/**
 * Reparte un monto en `parts` partes enteras que suman exactamente el total.
 * Los centavos sobrantes van a las primeras partes.
 */
export function allocateMoney(
  value: MoneyAmount,
  parts: number,
): MoneyAmount[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError(`Partes inválidas: ${parts}`);
  }
  const sign = value.amountMinor < 0 ? -1 : 1;
  const total = Math.abs(value.amountMinor);
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    money(sign * (base + (i < remainder ? 1 : 0)), value.currency),
  );
}

/** Compara dos montos de la misma moneda: negativo, cero o positivo. */
export function compareMoney(a: MoneyAmount, b: MoneyAmount): number {
  sameCurrency(a, b);
  return Math.sign(a.amountMinor - b.amountMinor);
}

/** Decimales de la moneda según ISO 4217 (por ejemplo 2 para USD y 0 para JPY). */
export function currencyDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/** Formatea un monto para personas en `locale`, por ejemplo `$ 1.500,00`. */
export function formatMoney(value: MoneyAmount, locale: string): string {
  const digits = currencyDigits(value.currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value.amountMinor / 10 ** digits);
}
