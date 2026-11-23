import { PlanPeriodicity } from '@contracts/billing';

/**
 * Periodo de facturación en fechas de calendario (`AAAA-MM-DD`), con el inicio y el fin incluidos. Un periodo
 * mensual termina el día anterior al mismo día del mes siguiente; si ese mes no tiene el día (un inicio el 31
 * antes de febrero), el siguiente empieza el último día de ese mes y los periodos quedan anclados desde
 * entonces a ese día, sin volver al 31.
 */
export class BillingPeriod {
  private static readonly DAY_MS = 86_400_000;

  private constructor(
    readonly start: string,
    readonly end: string,
  ) {}

  static of(start: string, end: string): BillingPeriod {
    return new BillingPeriod(start, end);
  }

  /** El periodo de `days` días que empieza en `start`. */
  static ofDays(start: string, days: number): BillingPeriod {
    return new BillingPeriod(start, BillingPeriod.plusDays(start, days - 1));
  }

  static starting(start: string, periodicity: PlanPeriodicity): BillingPeriod {
    const months = periodicity === PlanPeriodicity.Annual ? 12 : 1;
    const [year = 0, month = 1, day = 1] = start.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    const next = BillingPeriod.format(target);
    return new BillingPeriod(start, BillingPeriod.plusDays(next, -1));
  }

  /** La fecha de calendario UTC de un instante. */
  static dateOf(instant: Date): string {
    return BillingPeriod.format(instant);
  }

  next(periodicity: PlanPeriodicity): BillingPeriod {
    return BillingPeriod.starting(
      BillingPeriod.plusDays(this.end, 1),
      periodicity,
    );
  }

  /** El mismo periodo terminado el día anterior a `day`, que debe caer después del inicio. */
  endingBefore(day: string): BillingPeriod {
    return new BillingPeriod(this.start, BillingPeriod.plusDays(day, -1));
  }

  days(): number {
    return BillingPeriod.daysBetween(this.start, this.end) + 1;
  }

  /** Días que quedan desde `today` hasta el fin, ambos incluidos; cero si ya terminó. */
  remainingFrom(today: string): number {
    return Math.max(0, BillingPeriod.daysBetween(today, this.end) + 1);
  }

  hasEndedBy(today: string): boolean {
    return today > this.end;
  }

  private static plusDays(date: string, days: number): string {
    return BillingPeriod.format(
      new Date(
        Date.parse(`${date}T00:00:00.000Z`) + days * BillingPeriod.DAY_MS,
      ),
    );
  }

  private static daysBetween(from: string, to: string): number {
    return Math.round(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        BillingPeriod.DAY_MS,
    );
  }

  private static format(instant: Date): string {
    return instant.toISOString().slice(0, 10);
  }
}
