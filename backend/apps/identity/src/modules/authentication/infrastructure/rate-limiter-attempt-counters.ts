import { Injectable } from '@nestjs/common';
import { RateLimitRule, StrictRateLimiter } from '@platform/rate-limit';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { AttemptCounterRule } from '../domain/attempt-counter-rule.enum.js';
import {
  AttemptCounters,
  type AttemptCounts,
} from '../domain/attempt-counters.js';

/**
 * `AttemptCounters` over the platform `StrictRateLimiter`: one rule per dimension with its window. The
 * limit of each rule is its lockout threshold: once reached the count stops rising, and the policy
 * only asks whether it was reached. The limiter never degrades to a per-process count, so a Valkey outage
 * refuses the attempt with 503 instead of letting it bypass the lockout.
 */
@Injectable()
export class RateLimiterAttemptCounters extends AttemptCounters {
  private static readonly ORIGIN = RateLimitRule.define({
    name: AttemptCounterRule.Origin,
    limit: LockoutRules.origin.maxFailures,
    windowMs: LockoutRules.origin.windowMs,
  });
  private static readonly ACCOUNT = RateLimitRule.define({
    name: AttemptCounterRule.Account,
    limit: LockoutRules.protectedMode.maxFailures,
    windowMs: LockoutRules.protectedMode.windowMs,
  });
  private static readonly IP = RateLimitRule.define({
    name: AttemptCounterRule.Ip,
    limit: LockoutRules.ip.maxFailures,
    windowMs: LockoutRules.ip.windowMs,
  });

  constructor(private readonly limiter: StrictRateLimiter) {
    super();
  }

  override async recordFailure(
    origin: string,
    account: string,
    ip: string,
  ): Promise<AttemptCounts> {
    const [byOrigin, byAccount, byIp] = await Promise.all([
      this.limiter.consume(origin, RateLimiterAttemptCounters.ORIGIN),
      this.limiter.consume(account, RateLimiterAttemptCounters.ACCOUNT),
      this.limiter.consume(ip, RateLimiterAttemptCounters.IP),
    ]);
    return {
      origin: byOrigin.count,
      account: byAccount.count,
      ip: byIp.count,
    };
  }

  override async clearOrigin(origin: string): Promise<void> {
    await this.limiter.reset(origin, RateLimiterAttemptCounters.ORIGIN);
  }

  override async clearAccount(account: string): Promise<void> {
    await this.limiter.reset(account, RateLimiterAttemptCounters.ACCOUNT);
  }
}
