import type { ExecutionContext } from '@nestjs/common';

/** Gets the key that is limited for a request. */
export abstract class RateLimitKeyResolver {
  /**
   * Derives the key a request is limited by.
   * @param context Context of the request.
   * @returns The key.
   */
  abstract resolve(context: ExecutionContext): string;
}
