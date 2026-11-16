import { RateLimitTierRules } from '../rate-limit-tier-rules.js';
import { RateLimitTier } from '../rate-limit-tier.enum.js';

describe('RateLimitTierRules', () => {
  const rules = new RateLimitTierRules();

  it.each([
    [RateLimitTier.Auth, 'http.auth', 20],
    [RateLimitTier.Sensitive, 'http.sensitive', 60],
    [RateLimitTier.Standard, 'http.standard', 600],
    [RateLimitTier.Internal, 'http.internal', 6000],
  ])('maps %s to %s with %d per minute', (tier, name, limit) => {
    expect(rules.ruleFor(tier)).toMatchObject({
      name,
      limit,
      windowMs: 60_000,
    });
  });

  it('returns the same frozen rule for the same tier', () => {
    expect(rules.ruleFor(RateLimitTier.Auth)).toBe(
      rules.ruleFor(RateLimitTier.Auth),
    );
  });
});
