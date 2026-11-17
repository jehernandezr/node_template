import { Injectable } from '@nestjs/common';
import { RateLimitRule, RateLimiter } from '@platform/rate-limit';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { AttemptCounterRule } from '../domain/attempt-counter-rule.enum.js';
import {
  AttemptCounters,
  type AttemptCounts,
} from '../domain/attempt-counters.js';

/**
 * `AttemptCounters` sobre el `RateLimiter` de la plataforma: una regla por dimensión con su ventana. El
 * límite de cada regla es el umbral de su bloqueo: al alcanzarlo la cuenta deja de subir, y la política
 * solo pregunta si se alcanzó.
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

  constructor(private readonly limiter: RateLimiter) {
    super();
  }

  async recordFailure(
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

  async clearOrigin(origin: string): Promise<void> {
    await this.limiter.reset(origin, RateLimiterAttemptCounters.ORIGIN);
  }

  async clearAccount(account: string): Promise<void> {
    await this.limiter.reset(account, RateLimiterAttemptCounters.ACCOUNT);
  }
}
