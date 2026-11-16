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
 * Transporte HTTP entre servicios. Hace un solo intento: reintentos, tiempos
 * y breaker son del `InternalClient` con el `ResilienceRegistry`, y duplicarlos
 * aquí multiplicaría los intentos.
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
   * `POST {baseUrl}/internal/operations/{operationId}` (`InternalApiRoute.pathOf`) con cuerpo
   * JSON `{ "input": input }` (`InternalRequest`) y estas cabeceras de `InternalHeader`:
   * `content-type: application/json`; `traceparent`, `x-tenant-id` y `x-actor-id` solo si
   * `meta` los trae; `x-idempotency-key`; `x-call-deadline` (`meta.deadline`);
   * `x-call-timeout-ms` (`meta.timeoutMs`); y las que devuelve `signer.sign` sobre la
   * `SignableRequest` con método `POST`, esa ruta, el cuerpo `{ input }` y esas mismas
   * cabeceras. Envía con `fetcher` y `signal: meta.signal`, y entrega la respuesta a
   * `outcomeReader.read`. Los errores de `fetch` (red caída, aborto) se propagan: los
   * clasifica el registro de resiliencia.
   * @throws InternalApiError `UnknownService` si no hay URL para el servicio de la operación.
   */
  async invoke(
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
