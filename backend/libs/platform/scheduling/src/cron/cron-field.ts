import { InvalidCronExpressionError } from '../errors/invalid-cron-expression.error.js';

const DIGITS = /^\d+$/;

/** A field of a cron expression: the set of values it accepts. */
export class CronField {
  private constructor(
    private readonly values: ReadonlySet<number>,
    private readonly isRestricted: boolean,
  ) {}

  /**
   * Parses the text of a field: a list of comma-separated elements, each
   * one a value, a range or a step (over `*`, over a range or from a value),
   * with all values within `[min, max]`.
   * @throws InvalidCronExpressionError if the text does not follow the syntax or the range.
   */
  static parse(
    text: string,
    min: number,
    max: number,
    fieldName: string,
    expression: string,
  ): CronField {
    const values = new Set<number>();
    for (const element of text.split(',')) {
      for (const value of CronField.valuesOf(
        element,
        min,
        max,
        fieldName,
        expression,
      )) {
        values.add(value);
      }
    }
    // A field that starts with `*` does not restrict the day; anything else does.
    return new CronField(values, !text.startsWith('*'));
  }

  has(value: number): boolean {
    return this.values.has(value);
  }

  /** `true` when the field does not start with `*`. Used by the day-of-month and day-of-week rule. */
  get restricted(): boolean {
    return this.isRestricted;
  }

  private static valuesOf(
    element: string,
    min: number,
    max: number,
    fieldName: string,
    expression: string,
  ): number[] {
    const invalid = (reason: string): InvalidCronExpressionError =>
      new InvalidCronExpressionError(
        expression,
        `field ${fieldName}: ${reason}`,
      );
    const [range, stepText, ...extra] = element.split('/');
    if (range === '' || extra.length > 0) {
      throw invalid(`"${element}" is not a valid element`);
    }
    const step = stepText === undefined ? 1 : Number(stepText);
    if (stepText !== undefined && (!DIGITS.test(stepText) || step < 1)) {
      throw invalid(
        `the step "${stepText}" must be an integer greater than or equal to 1`,
      );
    }
    const bounds = CronField.boundsOf(range, min, max, invalid);
    const [start, end] = bounds;
    const hasStep = stepText !== undefined;
    const last = range.includes('-') || range === '*' || !hasStep ? end : max;
    const values: number[] = [];
    for (let value = start; value <= last; value += step) {
      values.push(value);
    }
    return values;
  }

  private static boundsOf(
    range: string,
    min: number,
    max: number,
    invalid: (reason: string) => InvalidCronExpressionError,
  ): [number, number] {
    if (range === '*') {
      return [min, max];
    }
    const parts = range.split('-');
    if (parts.length > 2) {
      throw invalid(`"${range}" is not a valid range`);
    }
    const [startText, endText = startText] = parts;
    const start = CronField.numberOf(startText, min, max, invalid);
    const end = CronField.numberOf(endText, min, max, invalid);
    if (start > end) {
      throw invalid(`the range "${range}" goes from greater to smaller`);
    }
    return [start, end];
  }

  private static numberOf(
    text: string,
    min: number,
    max: number,
    invalid: (reason: string) => InvalidCronExpressionError,
  ): number {
    if (!DIGITS.test(text)) {
      throw invalid(`"${text}" is not an integer`);
    }
    const value = Number(text);
    if (value < min || value > max) {
      throw invalid(`${value} is outside the range ${min}-${max}`);
    }
    return value;
  }
}
