import type { CallOutcome } from '@platform/primitives';
import type { InternalRequestSigner } from '../signing/internal-request-signer.js';
import type { CallMeta } from './call-meta.js';
import type { HttpOutcomeReader } from './http-outcome-reader.js';
import { InternalApiRoute } from './internal-api-route.js';
import { InternalHeader } from './internal-header.enum.js';
import type { InternalRequest } from './internal-request.js';
import type { ServiceBaseUrls } from './service-base-urls.js';
import { Transport } from './transport.js';

/**
 * HTTP transport between services. It makes a single attempt: retries, timeouts
 * and breaker belong to the `InternalClient` with the `ResilienceRegistry`, and duplicating them
 * here would multiply the attempts.
 */
export class HttpTransport extends Transport {
  private static readonly METHOD = 'POST';
  private static readonly CONTENT_TYPE = 'application/json';

  constructor(
    private readonly baseUrls: ServiceBaseUrls,
    private readonly signer: InternalRequestSigner,
    private readonly outcomeReader: HttpOutcomeReader,
    private readonly fetcher: typeof fetch,
  ) {
    super();
  }

  /**
   * Sends `POST {baseUrl}/internal/operations/{operationId}` (`InternalApiRoute.pathOf`) with a
   * JSON body `{ "input": input }` (`InternalRequest`) and these `InternalHeader` headers:
   * `content-type: application/json`; `traceparent`, `x-tenant-id` and `x-actor-id` only if
   * `meta` has them; `x-idempotency-key`; `x-call-deadline` (`meta.deadline`);
   * `x-call-timeout-ms` (`meta.timeoutMs`); and those returned by `signer.sign` on the
   * `SignableRequest` with method `POST`, that path, the body `{ input }` and those same
   * headers. It sends with `fetcher` and `signal: meta.signal`, and hands the response to
   * `outcomeReader.read`. `fetch` errors (network down, abort) propagate: the
   * resilience registry classifies them.
   * @throws InternalApiError `UnknownService` if there is no URL for the operation's service.
   */
  override async invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    const base = this.baseUrls.urlFor(operationId);
    const path = InternalApiRoute.pathOf(operationId);
    const body: InternalRequest = { input };
    const headers: Record<string, string> = {
      [InternalHeader.IdempotencyKey]: meta.idempotencyKey,
      [InternalHeader.Deadline]: String(meta.deadline),
      [InternalHeader.TimeoutMs]: String(meta.timeoutMs),
      ...(meta.traceparent !== undefined && {
        [InternalHeader.Traceparent]: meta.traceparent,
      }),
      ...(meta.tenantId !== undefined && {
        [InternalHeader.TenantId]: meta.tenantId,
      }),
      ...(meta.actorId !== undefined && {
        [InternalHeader.ActorId]: meta.actorId,
      }),
    };
    const signed = await this.signer.sign({
      method: HttpTransport.METHOD,
      path,
      baseUrl: base,
      body,
      headers,
    });
    const response = await this.fetcher(`${base}${path}`, {
      method: HttpTransport.METHOD,
      headers: {
        [InternalHeader.ContentType]: HttpTransport.CONTENT_TYPE,
        ...headers,
        ...signed,
      },
      body: JSON.stringify(body),
      signal: meta.signal,
    });
    return this.outcomeReader.read(response);
  }
}
