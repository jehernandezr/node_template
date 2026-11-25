/** Amount limits. Amounts travel in minor units (cents) as integers. */
export const MoneyLimits = {
  /** Largest absolute amount representable without loss in JavaScript and in Dart web. */
  maxAbsAmountMinor: 9007199254740991,
  /** Regular expression of the ISO 4217 currency code. */
  currencyPattern: '^[A-Z]{3}$',
} as const;
