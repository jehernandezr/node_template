import type { ExecutionContext } from '@nestjs/common';

/** Gets the key that is limited for a request. */
export abstract class RateLimitKeyResolver {
  abstract resolve(context: ExecutionContext): string;
}
