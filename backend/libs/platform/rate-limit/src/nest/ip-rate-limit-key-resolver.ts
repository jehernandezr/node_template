import { Injectable, type ExecutionContext } from '@nestjs/common';
import { RateLimitKeyResolver } from './rate-limit-key-resolver.js';
import { RateLimitKey } from './rate-limit-key.enum.js';

/** Limita por la IP de la petición. Sin IP, todas comparten la llave anónima. */
@Injectable()
export class IpRateLimitKeyResolver extends RateLimitKeyResolver {
  resolve(context: ExecutionContext): string {
    const ip = context.switchToHttp().getRequest<{ ip?: string }>().ip;
    return ip === undefined || ip === '' ? RateLimitKey.Anonymous : ip;
  }
}
