import { FixedClock } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '../../errors/invalid-argument.error.js';
import { RetryAfterParser } from '../retry-after-parser.js';

describe('RetryAfterParser', () => {
  const clock = new FixedClock(new Date('2025-01-01T00:00:00.000Z'));
  const parser = new RetryAfterParser(clock);

  it.each([
    ['seconds as text', '5', 5000],
    ['padded seconds', ' 5 ', 5000],
    ['zero', '0', 0],
    ['seconds as number', 2, 2000],
    ['fractional seconds round up', 0.0001, 1],
    ['HTTP date in the future', 'Wed, 01 Jan 2025 00:00:10 GMT', 10_000],
    ['HTTP date in the past', 'Tue, 31 Dec 2024 23:00:00 GMT', 0],
    ['Date in the future', new Date('2025-01-01T00:00:03.000Z'), 3000],
    ['above the cap', '999999', RetryAfterParser.DEFAULT_MAX_MS],
  ])('parses %s', (_label, value, expected) => {
    expect(parser.parse(value)).toBe(expected);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['text', 'soon'],
    ['date without a day name', '2025-01-01T00:00:10Z'],
    ['negative number', -1],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['too long', '1'.repeat(65)],
    ['invalid date', 'Foo, 99 Zzz 2025'],
    ['invalid Date object', new Date('x')],
  ])('returns undefined for %s', (_label, value) => {
    expect(parser.parse(value)).toBeUndefined();
  });

  it('honours a custom cap', () => {
    expect(new RetryAfterParser(clock, 1000).parse('30')).toBe(1000);
  });

  it('rejects an invalid cap', () => {
    expect(() => new RetryAfterParser(clock, -1)).toThrow(InvalidArgumentError);
  });
});
