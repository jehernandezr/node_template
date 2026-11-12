/** Límites de los montos. Los montos viajan en unidades menores (centavos) como enteros. */
export const MoneyLimits = {
  /** Mayor monto absoluto representable sin pérdida en JavaScript y en Dart web. */
  maxAbsAmountMinor: 9007199254740991,
  /** Expresión regular del código de moneda ISO 4217. */
  currencyPattern: '^[A-Z]{3}$',
} as const;
