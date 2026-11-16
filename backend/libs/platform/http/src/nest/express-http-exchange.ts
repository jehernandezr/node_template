import { HttpExchange } from '../http-exchange.js';
import type { ClientInfo } from '../client-info.js';
import { HttpHeader } from '../http-header.enum.js';
import type { HttpResponseView } from '../http-response-view.js';
import { SessionCookie } from '../cookies/session-cookie.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * `HttpExchange` sobre la petición y la respuesta de Express. `client` sale de lo que dejó
 * `OriginPolicyMiddleware` en la petición (`HttpRequestKey.ClientInfo`).
 */
export class ExpressHttpExchange extends HttpExchange {
  constructor(
    protected readonly request: PipelineRequest,
    protected readonly response: HttpResponseView,
  ) {
    super();
  }

  get client(): ClientInfo {
    const client = this.request[HttpRequestKey.ClientInfo];
    if (client === undefined) {
      throw new Error('ClientInfo missing: OriginPolicyMiddleware did not run');
    }
    return client;
  }

  sessionCookie(): string | undefined {
    return new SessionCookie().read(this.request.headers[HttpHeader.Cookie]);
  }

  setSessionCookie(token: string, maxAgeMs: number): void {
    this.response.append(
      HttpHeader.SetCookie,
      new SessionCookie().serialize(token, maxAgeMs),
    );
  }

  clearSessionCookie(): void {
    this.response.append(
      HttpHeader.SetCookie,
      new SessionCookie().serializeClear(),
    );
  }

  setHeader(name: string, value: string): void {
    this.response.setHeader(name, value);
  }
}
