import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitExceededError } from '../errors/rate-limit-exceeded.error.js';
import { RateLimiter } from '../rate-limiter.js';
import { RateLimitKeyResolver } from './rate-limit-key-resolver.js';
import type { RateLimitMetadata } from './rate-limit.metadata.js';
import { RATE_LIMIT_METADATA } from './rate-limit-tokens.js';

/** Aplica la regla de `@RateLimit` a la ruta. Las rutas sin regla pasan. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiter,
    private readonly resolver: RateLimitKeyResolver,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<
      RateLimitMetadata | undefined
    >(RATE_LIMIT_METADATA, [context.getHandler(), context.getClass()]);
    if (metadata === undefined) {
      return true;
    }
    const result = await this.limiter.consume(
      this.resolver.resolve(context),
      metadata.rule,
      metadata.cost,
    );
    if (!result.allowed) {
      throw new RateLimitExceededError(metadata.rule.name, result.retryAfterMs);
    }
    return true;
  }
}
