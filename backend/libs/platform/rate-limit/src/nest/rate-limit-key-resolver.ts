import type { ExecutionContext } from '@nestjs/common';

/** Obtiene la llave que se limita para una petición. */
export abstract class RateLimitKeyResolver {
  abstract resolve(context: ExecutionContext): string;
}
