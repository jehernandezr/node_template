import { InvalidArgumentError } from '@platform/primitives';
import {
  assertRateLimitCall,
  assertRateLimitRule,
  defineRateLimitRule,
  RATE_LIMIT_MAX_KEY_LENGTH,
  RATE_LIMIT_MAX_LIMIT,
  RATE_LIMIT_MAX_WINDOW_MS,
  type RateLimitRule,
} from '../rate-limit-rule.js';

const RULE: RateLimitRule = { name: 'sign-in.ip', limit: 10, windowMs: 60_000 };

function argumentOf(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidArgumentError);
    return (error as InvalidArgumentError).details?.['argument'];
  }
  throw new Error('expected an InvalidArgumentError');
}

describe('assertRateLimitRule', () => {
  it.each(['a', 'sign-in.ip', 'API_keys-1', 'x'.repeat(64)])(
    'accepts the name %s',
    (name) => {
      expect(() => assertRateLimitRule({ ...RULE, name })).not.toThrow();
    },
  );

  it.each([
    '',
    '-leading',
    'with:colon',
    '{tag}',
    'with space',
    'x'.repeat(65),
  ])('rejects the name %p', (name) => {
    expect(argumentOf(() => assertRateLimitRule({ ...RULE, name }))).toBe(
      'rule.name',
    );
  });

  it('rejects a name that is not a string', () => {
    const rule = { ...RULE, name: 7 } as unknown as RateLimitRule;
    expect(argumentOf(() => assertRateLimitRule(rule))).toBe('rule.name');
  });

  it.each([0, -1, 1.5, Number.NaN, RATE_LIMIT_MAX_LIMIT + 1])(
    'rejects the limit %p',
    (limit) => {
      expect(argumentOf(() => assertRateLimitRule({ ...RULE, limit }))).toBe(
        'rule.limit',
      );
    },
  );

  it.each([0, 2.5, Number.POSITIVE_INFINITY, RATE_LIMIT_MAX_WINDOW_MS + 1])(
    'rejects the window %p',
    (windowMs) => {
      expect(argumentOf(() => assertRateLimitRule({ ...RULE, windowMs }))).toBe(
        'rule.windowMs',
      );
    },
  );

  it('accepts the upper bounds', () => {
    expect(() =>
      assertRateLimitRule({
        name: 'max',
        limit: RATE_LIMIT_MAX_LIMIT,
        windowMs: RATE_LIMIT_MAX_WINDOW_MS,
      }),
    ).not.toThrow();
  });
});

describe('assertRateLimitCall', () => {
  it('accepts a cost from 1 to the limit and defaults it to 1', () => {
    expect(() => assertRateLimitCall('k', RULE)).not.toThrow();
    expect(() => assertRateLimitCall('k', RULE, RULE.limit)).not.toThrow();
  });

  it.each([0, -1, 1.5, RULE.limit + 1])('rejects the cost %p', (cost) => {
    expect(argumentOf(() => assertRateLimitCall('k', RULE, cost))).toBe('cost');
  });

  it.each(['', 'x'.repeat(RATE_LIMIT_MAX_KEY_LENGTH + 1), 3])(
    'rejects the key %p',
    (key) => {
      expect(argumentOf(() => assertRateLimitCall(key as string, RULE))).toBe(
        'key',
      );
    },
  );

  it('validates the rule', () => {
    expect(
      argumentOf(() => assertRateLimitCall('k', { ...RULE, limit: 0 })),
    ).toBe('rule.limit');
  });
});

describe('defineRateLimitRule', () => {
  it('returns a frozen copy without extra fields', () => {
    const input = { ...RULE, extra: true };
    const rule = defineRateLimitRule(input);
    expect(rule).toEqual(RULE);
    expect(Object.isFrozen(rule)).toBe(true);
    expect(rule).not.toBe(input);
  });

  it('fails on an invalid rule', () => {
    expect(
      argumentOf(() => defineRateLimitRule({ ...RULE, windowMs: 0 })),
    ).toBe('rule.windowMs');
  });
});
