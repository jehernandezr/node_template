import { HttpExchange } from '../http-exchange.js';
import type { ClientInfo } from '../client-info.js';
import { HttpHeader } from '../http-header.enum.js';
import type { HttpResponseView } from '../http-response-view.js';
import { SessionCookie } from '../cookies/session-cookie.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * `HttpExchange` over the Express request and response. `client` comes from what
 * `OriginPolicyMiddleware` left on the request (`HttpRequestKey.ClientInfo`).
 */
export class ExpressHttpExchange extends HttpExchange {
  constructor(
    protected readonly request: PipelineRequest,
    protected readonly response: HttpResponseView,
  ) {
    super();
  }

  override get client(): ClientInfo {
    const client = this.request[HttpRequestKey.ClientInfo];
    if (client === undefined) {
      throw new Error('ClientInfo missing: OriginPolicyMiddleware did not run');
    }
    return client;
  }

  override sessionCookie(): string | undefined {
    return new SessionCookie().read(this.request.headers[HttpHeader.Cookie]);
  }

  override setSessionCookie(token: string, maxAgeMs: number): void {
    this.response.append(
      HttpHeader.SetCookie,
      new SessionCookie().serialize(token, maxAgeMs),
    );
  }

  override clearSessionCookie(): void {
    this.response.append(
      HttpHeader.SetCookie,
      new SessionCookie().serializeClear(),
    );
  }

  override setHeader(name: string, value: string): void {
    this.response.setHeader(name, value);
  }
}
