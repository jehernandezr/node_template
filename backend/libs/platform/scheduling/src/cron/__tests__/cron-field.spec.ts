import { SchedulingErrorCode } from '../../errors/scheduling-error-code.enum.js';
import { CronField } from '../cron-field.js';

const parse = (text: string, min: number, max: number): CronField =>
  CronField.parse(text, min, max, 'prueba', text);

describe('CronField', () => {
  describe('when the text is valid', () => {
    it.each([
      ['*', 0, 3, [0, 1, 2, 3]],
      ['*/2', 0, 5, [0, 2, 4]],
      ['1-3', 0, 9, [1, 2, 3]],
      ['1-5/2', 0, 9, [1, 3, 5]],
      ['2/3', 0, 9, [2, 5, 8]],
      ['1,4,6', 0, 9, [1, 4, 6]],
    ])('parses %s between %i and %i into %j', (text, min, max, expected) => {
      const field = parse(text, min, max);
      const allowed = Array.from(
        { length: max - min + 1 },
        (_, i) => min + i,
      ).filter((value) => field.has(value));
      expect(allowed).toEqual(expected);
    });
  });

  describe('when checking restriction', () => {
    it.each(['*', '*/5'])('is not restricted for %s', (text) => {
      expect(parse(text, 0, 59).restricted).toBe(false);
    });

    it.each(['1-3', '7'])('is restricted for %s', (text) => {
      expect(parse(text, 0, 59).restricted).toBe(true);
    });
  });

  describe('when the text is invalid', () => {
    it.each([
      ['x', 0, 59],
      ['5-1', 0, 59],
      ['*/0', 0, 59],
      ['60', 0, 59],
      ['', 0, 59],
      ['1,', 0, 59],
    ])('rejects %s with an invalid cron code', (text, min, max) => {
      expect(() => parse(text, min, max)).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidCronExpression,
        }),
      );
    });
  });
});
