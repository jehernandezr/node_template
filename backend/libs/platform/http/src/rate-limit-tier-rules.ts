import { RateLimitRule } from '@platform/rate-limit';
import { RateLimitTier } from './rate-limit-tier.enum.js';

/** Translates each `RateLimitTier` into its sliding window rule. */
export class RateLimitTierRules {
  private static readonly WINDOW_MS = 60_000;

  private static readonly AUTH = RateLimitRule.define({
    name: 'http.auth',
    limit: 20,
    windowMs: RateLimitTierRules.WINDOW_MS,
  });
  private static readonly SENSITIVE = RateLimitRule.define({
    name: 'http.sensitive',
    limit: 60,
    windowMs: RateLimitTierRules.WINDOW_MS,
  });
  private static readonly STANDARD = RateLimitRule.define({
    name: 'http.standard',
    limit: 600,
    windowMs: RateLimitTierRules.WINDOW_MS,
  });
  private static readonly INTERNAL = RateLimitRule.define({
    name: 'http.internal',
    limit: 6000,
    windowMs: RateLimitTierRules.WINDOW_MS,
  });

  ruleFor(tier: RateLimitTier): RateLimitRule {
    switch (tier) {
      case RateLimitTier.Auth:
        return RateLimitTierRules.AUTH;
      case RateLimitTier.Sensitive:
        return RateLimitTierRules.SENSITIVE;
      case RateLimitTier.Standard:
        return RateLimitTierRules.STANDARD;
      case RateLimitTier.Internal:
        return RateLimitTierRules.INTERNAL;
    }
  }
}
