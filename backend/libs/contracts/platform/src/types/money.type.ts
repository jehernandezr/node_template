/** Monto en unidades menores de la moneda (por ejemplo centavos), siempre entero. */
export interface MoneyAmount {
  amountMinor: number;
  /** Código ISO 4217 en mayúsculas, por ejemplo `COP`. */
  currency: string;
}
