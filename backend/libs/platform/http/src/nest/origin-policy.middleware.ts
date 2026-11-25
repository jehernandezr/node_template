import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { ClientInfo } from '../client-info.js';
import { ClientChannelResolver } from '../client-channel-resolver.js';
import { HttpHeader } from '../http-header.enum.js';
import { HttpLimits } from '../http-limits.js';
import { HttpProblemError } from '../http-problem.error.js';
import { OriginPolicy } from '../origin-policy.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * Rejects origins not on the list and leaves the client's `ClientInfo` on the request.
 */
@Injectable()
export class OriginPolicyMiddleware implements NestMiddleware {
  constructor(private readonly policy: OriginPolicy) {}

  use(request: PipelineRequest, _response: unknown, next: () => void): void {
    const origin = request.headers[HttpHeader.Origin];
    const originValue = typeof origin === 'string' ? origin : undefined;
    if (!this.policy.isAllowed(originValue)) {
      throw HttpProblemError.originRejected();
    }
    const userAgent = request.headers[HttpHeader.UserAgent];
    const client: ClientInfo = {
      ip: request.ip ?? '',
      channel: ClientChannelResolver.resolve(request.headers),
      ...(typeof userAgent === 'string' && {
        userAgent: userAgent.slice(0, HttpLimits.MAX_USER_AGENT_LENGTH),
      }),
      ...(originValue !== undefined && { origin: originValue }),
    };
    request[HttpRequestKey.ClientInfo] = client;
    next();
  }
}
