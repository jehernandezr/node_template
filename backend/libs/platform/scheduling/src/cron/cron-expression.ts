import { InvalidCronExpressionError } from '../errors/invalid-cron-expression.error.js';
import { CronField } from './cron-field.js';

const SECOND_MS = 1_000;
const SEARCH_YEARS = 5;
const SUNDAY = 0;
const SUNDAY_AS_SEVEN = 7;

/**
 * Expresión cron en UTC de 5 campos (minuto, hora, día del mes, mes, día de la
 * semana) o de 6 (con segundos al inicio). Admite `*`, listas, rangos y pasos.
 * Si el día del mes y el de la semana están ambos restringidos, basta con que
 * se cumpla uno. El domingo es 0 o 7.
 */
export class CronExpression {
  private constructor(
    readonly source: string,
    private readonly seconds: CronField,
    private readonly minutes: CronField,
    private readonly hours: CronField,
    private readonly daysOfMonth: CronField,
    private readonly months: CronField,
    private readonly daysOfWeek: CronField,
  ) {}

  /** @throws InvalidCronExpressionError cuando la expresión no es válida. */
  static parse(expression: string): CronExpression {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5 && fields.length !== 6) {
      throw new InvalidCronExpressionError(
        expression,
        'se esperaban 5 o 6 campos',
      );
    }
    // Sin segundos, la expresión dispara al inicio del minuto.
    const [secondsText, ...rest] =
      fields.length === 6 ? fields : ['0', ...fields];
    const field = (text: string, min: number, max: number, name: string) =>
      CronField.parse(text, min, max, name, expression);
    return new CronExpression(
      expression,
      field(secondsText, 0, 59, 'segundos'),
      field(rest[0], 0, 59, 'minutos'),
      field(rest[1], 0, 23, 'hora'),
      field(rest[2], 1, 31, 'día del mes'),
      field(rest[3], 1, 12, 'mes'),
      field(rest[4], 0, 7, 'día de la semana'),
    );
  }

  /**
   * Primer instante estrictamente posterior a `from` que cumple la expresión, en UTC.
   * @throws InvalidCronExpressionError si no hay ninguna fecha en los cinco años siguientes.
   */
  nextAfter(from: Date): Date {
    // El tope se calcula una vez: sin él, una expresión imposible como el 31 de febrero no terminaría.
    const limit = Date.UTC(
      from.getUTCFullYear() + SEARCH_YEARS,
      from.getUTCMonth(),
      from.getUTCDate(),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
    );
    let candidate = new Date(
      Math.floor(from.getTime() / SECOND_MS) * SECOND_MS + SECOND_MS,
    );
    while (candidate.getTime() <= limit) {
      const next = this.skip(candidate);
      if (next === undefined) {
        return candidate;
      }
      candidate = next;
    }
    throw new InvalidCronExpressionError(
      this.source,
      'no tiene ninguna fecha futura',
    );
  }

  /** `undefined` si `at` cumple; si no, el siguiente instante que puede cumplir. */
  private skip(at: Date): Date | undefined {
    const year = at.getUTCFullYear();
    const month = at.getUTCMonth();
    const day = at.getUTCDate();
    const hour = at.getUTCHours();
    const minute = at.getUTCMinutes();
    if (!this.months.has(month + 1)) {
      return new Date(Date.UTC(year, month + 1, 1));
    }
    if (!this.matchesDay(at)) {
      return new Date(Date.UTC(year, month, day + 1));
    }
    if (!this.hours.has(hour)) {
      return new Date(Date.UTC(year, month, day, hour + 1));
    }
    if (!this.minutes.has(minute)) {
      return new Date(Date.UTC(year, month, day, hour, minute + 1));
    }
    if (!this.seconds.has(at.getUTCSeconds())) {
      return new Date(at.getTime() + SECOND_MS);
    }
    return undefined;
  }

  private matchesDay(at: Date): boolean {
    const dayOfMonth = this.daysOfMonth.has(at.getUTCDate());
    const weekDay = at.getUTCDay();
    const dayOfWeek =
      this.daysOfWeek.has(weekDay) ||
      (weekDay === SUNDAY && this.daysOfWeek.has(SUNDAY_AS_SEVEN));
    if (this.daysOfMonth.restricted && this.daysOfWeek.restricted) {
      return dayOfMonth || dayOfWeek;
    }
    return dayOfMonth && dayOfWeek;
  }
}
