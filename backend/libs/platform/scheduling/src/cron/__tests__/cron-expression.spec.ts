import { SchedulingErrorCode } from '../../errors/scheduling-error-code.enum.js';
import { CronExpression } from '../cron-expression.js';

const at = (iso: string): Date => new Date(iso);

describe('CronExpression', () => {
  describe('when the expression is 0 3 * * *', () => {
    it.each([
      ['2026-12-31T04:00:00.000Z', '2027-01-01T03:00:00.000Z'],
      ['2026-11-14T02:59:59.999Z', '2026-11-14T03:00:00.000Z'],
      ['2026-11-14T03:00:00.000Z', '2026-11-15T03:00:00.000Z'],
      ['2028-02-28T03:00:00.000Z', '2028-02-29T03:00:00.000Z'],
    ])('after %s gives %s', (from, expected) => {
      const next = CronExpression.parse('0 3 * * *').nextAfter(at(from));
      expect(next.toISOString()).toBe(expected);
    });
  });

  describe('when the expression varies', () => {
    it.each([
      ['*/15 * * * *', '2026-11-14T10:07:00.000Z', '2026-11-14T10:15:00.000Z'],
      [
        '*/10 * * * * *',
        '2026-11-14T10:07:03.500Z',
        '2026-11-14T10:07:10.000Z',
      ],
      ['0 9 * * 1', '2026-11-14T12:00:00.000Z', '2026-11-16T09:00:00.000Z'],
      ['0 9 * * 7', '2026-11-14T12:00:00.000Z', '2026-11-15T09:00:00.000Z'],
      ['0 0 29 2 *', '2026-11-14T00:00:00.000Z', '2028-02-29T00:00:00.000Z'],
      ['0 0 1,15 * 0', '2026-11-14T00:00:00.000Z', '2026-11-15T00:00:00.000Z'],
      ['0 0 1 * 1', '2026-11-14T00:00:00.000Z', '2026-11-16T00:00:00.000Z'],
    ])('%s after %s gives %s', (cron, from, expected) => {
      const next = CronExpression.parse(cron).nextAfter(at(from));
      expect(next.toISOString()).toBe(expected);
    });
  });

  describe('when the expression is invalid', () => {
    it.each([
      [''],
      ['* * * *'],
      ['* * * * * * *'],
      ['60 * * * *'],
      ['*/0 * * * *'],
      ['5-1 * * * *'],
      ['a * * * *'],
      ['* * 32 * *'],
      ['* * * 13 *'],
      ['* * * * 8'],
    ])('rejects "%s" with an invalid cron code', (cron) => {
      expect(() => CronExpression.parse(cron)).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidCronExpression,
        }),
      );
    });
  });

  describe('when the expression never matches', () => {
    it('rejects nextAfter with an invalid cron code', () => {
      expect(() =>
        CronExpression.parse('0 0 31 2 *').nextAfter(
          at('2026-11-14T00:00:00.000Z'),
        ),
      ).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidCronExpression,
        }),
      );
    });
  });

  describe('when the source has surrounding spaces', () => {
    it('keeps the source exactly as received', () => {
      expect(CronExpression.parse('  0 3 * * *  ').source).toBe(
        '  0 3 * * *  ',
      );
    });
  });
});
