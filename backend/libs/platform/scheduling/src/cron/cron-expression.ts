import { InvalidCronExpressionError } from '../errors/invalid-cron-expression.error.js';
import { CronField } from './cron-field.js';

const SECOND_MS = 1_000;
const SEARCH_YEARS = 5;
const SUNDAY = 0;
const SUNDAY_AS_SEVEN = 7;

/**
 * UTC cron expression with 5 fields (minute, hour, day of month, month, day of
 * week) or 6 (with seconds first). Supports `*`, lists, ranges and steps.
 * If day of month and day of week are both restricted, it is enough for
 * one of them to match. Sunday is 0 or 7.
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

  /**
   * Parses a five or six field cron expression in UTC.
   * Without seconds, the expression fires at the start of the minute.
   * @param expression Cron text.
   * @returns The expression.
   * @throws InvalidCronExpressionError when the expression is not valid.
   */
  static parse(expression: string): CronExpression {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5 && fields.length !== 6) {
      throw new InvalidCronExpressionError(
        expression,
        'expected 5 or 6 fields',
      );
    }
    const [secondsText, ...rest] =
      fields.length === 6 ? fields : ['0', ...fields];
    const field = (text: string, min: number, max: number, name: string) =>
      CronField.parse(text, min, max, name, expression);
    return new CronExpression(
      expression,
      field(secondsText, 0, 59, 'seconds'),
      field(rest[0], 0, 59, 'minutes'),
      field(rest[1], 0, 23, 'hour'),
      field(rest[2], 1, 31, 'day of month'),
      field(rest[3], 1, 12, 'month'),
      field(rest[4], 0, 7, 'day of week'),
    );
  }

  /**
   * First instant strictly after `from` that matches the expression, in UTC.
   * The limit is computed once: without it, an impossible expression such as February 31 would never end.
   * @param from Instant to start after.
   * @returns The next instant.
   * @throws InvalidCronExpressionError if there is no date in the next five years.
   */
  nextAfter(from: Date): Date {
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
    throw new InvalidCronExpressionError(this.source, 'has no future date');
  }

  /** `undefined` if `at` matches; otherwise, the next instant that can match. */
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
