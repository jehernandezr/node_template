import {
  InvalidArgumentError,
  PrimitivesErrorCode,
} from '@platform/primitives';
import { RateLimitLimits } from '../rate-limit-limits.js';
import { RateLimitRule } from '../rate-limit-rule.js';

const VALID: RateLimitRule = {
  name: 'login.by-ip',
  limit: 5,
  windowMs: 60_000,
};

describe('RateLimitRule', () => {
  describe('validate', () => {
    it.each<[string, RateLimitRule, string]>([
      ['an empty name', { ...VALID, name: '' }, 'rule.name'],
      ['a name with a colon', { ...VALID, name: 'a:b' }, 'rule.name'],
      ['a name starting with a dot', { ...VALID, name: '.a' }, 'rule.name'],
      ['a zero limit', { ...VALID, limit: 0 }, 'rule.limit'],
      ['a fractional limit', { ...VALID, limit: 1.5 }, 'rule.limit'],
      [
        'a limit above the maximum',
        { ...VALID, limit: RateLimitLimits.MAX_LIMIT + 1 },
        'rule.limit',
      ],
      ['a zero window', { ...VALID, windowMs: 0 }, 'rule.windowMs'],
      [
        'a window above the maximum',
        { ...VALID, windowMs: RateLimitLimits.MAX_WINDOW_MS + 1 },
        'rule.windowMs',
      ],
    ])('rejects %s naming %s', (_label, rule, argument) => {
      expect(() => RateLimitRule.validate(rule)).toThrow(
        expect.objectContaining({
          code: PrimitivesErrorCode.InvalidArgument,
          details: expect.objectContaining({ argument }),
        }),
      );
    });

    it('accepts a valid rule', () => {
      expect(() => RateLimitRule.validate(VALID)).not.toThrow();
    });
  });

  describe('define', () => {
    it('returns a frozen rule with the same values', () => {
      const defined = RateLimitRule.define(VALID);

      expect(defined).toBeInstanceOf(RateLimitRule);
      expect(defined).toEqual(VALID);
      expect(Object.isFrozen(defined)).toBe(true);
    });

    it('rejects an invalid rule', () => {
      expect(() => RateLimitRule.define({ ...VALID, limit: 0 })).toThrow(
        InvalidArgumentError,
      );
    });
  });
});
