import { Injectable, type NestMiddleware } from '@nestjs/common';
import { RequestContextStore } from '../context/request-context-store.js';
import { DebugSampler } from '../logging/debug-sampler.js';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';
import type {
  RequestContextHttpRequest,
  RequestContextHttpResponse,
} from './request-context.http.js';

/**
 * Abre el `RequestContext` de cada petición HTTP: `traceId` UUIDv7 propio (o el
 * del span activo), `externalTraceId` si el cliente mandó un `traceparent`
 * válido, muestra de debug, y devuelve el `traceId` en el header `x-trace-id`.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  /** Header de respuesta con el `traceId` de la plataforma. */
  static readonly TRACE_ID_HEADER = 'x-trace-id';

  constructor(
    private readonly store: RequestContextStore,
    private readonly codec: TraceContextCodec,
    private readonly sampler: DebugSampler,
  ) {}

  use(
    request: RequestContextHttpRequest,
    response: RequestContextHttpResponse,
    next: () => void,
  ): void {
    const raw = request.headers[TraceContextCodec.TRACEPARENT_HEADER];
    const header = Array.isArray(raw) ? raw[0] : raw;
    const external = TraceContextCodec.parseTraceparent(header);
    this.store.run(
      {
        traceId: this.codec.newTraceId(),
        ...(external !== null && { externalTraceId: external.traceId }),
        debugSampled: this.sampler.shouldSample(),
      },
      () => {
        response.setHeader(
          RequestContextMiddleware.TRACE_ID_HEADER,
          this.store.current()?.traceId ?? '',
        );
        next();
      },
    );
  }
}
