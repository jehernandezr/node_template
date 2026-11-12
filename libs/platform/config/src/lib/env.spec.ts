import { envBoolean, envDuration, envList, envNumber } from './env.js';

describe('envBoolean', () => {
  const schema = envBoolean();

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    [' TRUE ', true],
  ])('parses %j as %s', (input, expected) => {
    expect(schema.parse(input)).toBe(expected);
  });

  it.each(['yes', 'on', '2', ''])('rejects %j', (input) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('envNumber', () => {
  it('parses finite numbers', () => {
    expect(envNumber().parse('42')).toBe(42);
    expect(envNumber().parse(' 0.5 ')).toBe(0.5);
  });

  it('accepts bounds inclusively', () => {
    const schema = envNumber({ min: 0, max: 1 });
    expect(schema.parse('0')).toBe(0);
    expect(schema.parse('1')).toBe(1);
  });

  it.each(['abc', '', 'NaN', 'Infinity'])(
    'rejects non-finite input %j',
    (input) => {
      expect(envNumber().safeParse(input).success).toBe(false);
    },
  );

  it('rejects values outside the bounds', () => {
    const schema = envNumber({ min: 0, max: 1 });
    const below = schema.safeParse('-0.1');
    const above = schema.safeParse('1.5');
    expect(below.success).toBe(false);
    expect(above.success).toBe(false);
    if (!below.success) {
      expect(below.error.issues[0]?.message).toBe('expected a number >= 0');
    }
    if (!above.success) {
      expect(above.error.issues[0]?.message).toBe('expected a number <= 1');
    }
  });
});

describe('envList', () => {
  it('splits, trims and drops empty entries', () => {
    expect(envList().parse('auth, reports ,,billing')).toEqual([
      'auth',
      'reports',
      'billing',
    ]);
  });

  it('returns [] for an empty string', () => {
    expect(envList().parse('')).toEqual([]);
    expect(envList().parse(' , ')).toEqual([]);
  });
});

describe('envDuration', () => {
  it.each([
    ['500ms', 500],
    ['5s', 5_000],
    ['10m', 600_000],
    ['1h', 3_600_000],
    ['2d', 172_800_000],
    [' 3s ', 3_000],
  ])('parses %j into %i ms', (input, expected) => {
    expect(envDuration().parse(input)).toBe(expected);
  });

  it.each(['5', '5 seconds', 'abc', '-1s', '1.5s', '', '10w'])(
    'rejects %j',
    (input) => {
      expect(envDuration().safeParse(input).success).toBe(false);
    },
  );
});
