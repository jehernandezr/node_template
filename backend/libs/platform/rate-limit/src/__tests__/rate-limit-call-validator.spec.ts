import { PrimitivesErrorCode } from '@platform/primitives';
import { RateLimitCallValidator } from '../rate-limit-call-validator.js';
import { RateLimitLimits } from '../rate-limit-limits.js';
import type { RateLimitRule } from '../rate-limit-rule.js';

const VALID: RateLimitRule = {
  name: 'login.by-ip',
  limit: 5,
  windowMs: 60_000,
};

describe('RateLimitCallValidator', () => {
  it.each<[string, string, RateLimitRule, number | undefined, string]>([
    ['an empty key', '', VALID, undefined, 'key'],
    [
      'a key over the maximum length',
      'x'.repeat(RateLimitLimits.MAX_KEY_LENGTH + 1),
      VALID,
      undefined,
      'key',
    ],
    [
      'an invalid rule',
      'k',
      { ...VALID, windowMs: 0 },
      undefined,
      'rule.windowMs',
    ],
    ['a zero cost', 'k', VALID, 0, 'cost'],
    ['a cost above the limit', 'k', VALID, 6, 'cost'],
  ])('rejects a call with %s', (_label, key, rule, cost, argument) => {
    expect(() => RateLimitCallValidator.validate(key, rule, cost)).toThrow(
      expect.objectContaining({
        code: PrimitivesErrorCode.InvalidArgument,
        details: expect.objectContaining({ argument }),
      }),
    );
  });

  it('accepts a call with the default cost', () => {
    expect(() => RateLimitCallValidator.validate('k', VALID)).not.toThrow();
  });
});
