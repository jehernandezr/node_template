import type { BillingPeriod } from './billing-period.js';

/**
 * Ajuste de un cambio de plan a mitad de periodo: la diferencia de precio por la fracción del periodo que
 * queda desde hoy, en enteros de la unidad menor y redondeada al alza. Un cambio a un plan más barato da un
 * crédito (negativo).
 */
export class ProrationCalculator {
  static adjustment(
    fromPriceMinor: number,
    toPriceMinor: number,
    period: BillingPeriod,
    today: string,
  ): number {
    const remaining = period.remainingFrom(today);
    return Math.ceil(
      ((toPriceMinor - fromPriceMinor) * remaining) / period.days(),
    );
  }
}
