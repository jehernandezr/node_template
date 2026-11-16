import { ActorGuards, type Actor } from '@platform/auth';
import { RateLimiter } from '@platform/rate-limit';
import type { ClientInfo } from './client-info.js';
import { HttpProblemError } from './http-problem.error.js';
import { RateLimitTier } from './rate-limit-tier.enum.js';
import type { RateLimitTierRules } from './rate-limit-tier-rules.js';

/** Cuenta cada petición contra el límite de su escalón. */
export class RateLimitGate {
  constructor(
    private readonly limiter: RateLimiter,
    private readonly rules: RateLimitTierRules,
  ) {}

  /** @throws HttpProblemError (`PLATFORM.RATE_LIMIT.EXCEEDED`) con el tiempo de espera. */
  async check(tier: RateLimitTier, key: string): Promise<void> {
    const result = await this.limiter.consume(key, this.rules.ruleFor(tier));
    if (!result.allowed) {
      throw HttpProblemError.rateLimited(
        Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
      );
    }
  }

  /**
   * La llave del límite: por IP en el tier de auth o sin actor; por actor en los demás.
   */
  static keyFor(
    tier: RateLimitTier,
    client: ClientInfo,
    actor?: Actor,
  ): string {
    if (tier === RateLimitTier.Auth || actor === undefined) {
      return `ip:${client.ip}`;
    }
    if (ActorGuards.isUser(actor)) {
      return `actor:${actor.tenantId}:${actor.userId}`;
    }
    if (ActorGuards.isServiceAccount(actor)) {
      return `actor:${actor.tenantId}:${actor.serviceAccountId}`;
    }
    return `system:${actor.name}`;
  }
}
