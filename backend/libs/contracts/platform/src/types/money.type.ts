/** Amount in minor units of the currency (for example cents), always an integer. */
export interface MoneyAmount {
  amountMinor: number;
  /** Uppercase ISO 4217 code, for example `COP`. */
  currency: string;
}
