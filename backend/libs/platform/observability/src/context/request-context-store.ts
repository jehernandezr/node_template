import { AsyncLocalStorage } from 'node:async_hooks';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';
import { Tracing } from '../tracing/tracing.js';
import type { RequestContextData } from './request-context-data.js';
import type { RequestContextInit } from './request-context-init.js';

/**
 * Contexto de negocio de cada petición, mensaje o job: tenant, actor, región,
 * `externalTraceId` y la muestra de debug. Se propaga por las llamadas
 * asíncronas con un `AsyncLocalStorage` privado.
 *
 * Los ids de traza no se duplican: si hay un span de OpenTelemetry activo,
 * `current()` devuelve su `traceId` y su `spanId`. Los valores guardados solo
 * se usan cuando el SDK está apagado o no hay span (por ejemplo, en pruebas).
 * Sin contexto abierto devuelve `undefined` aunque haya un span: así el
 * `RequestContextInterceptor` sabe que debe abrir uno.
 */
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  constructor(private readonly tracing: Tracing) {}

  /** Abre un contexto. Valida y normaliza los ids una sola vez; nunca lanza por ids malformados. */
  run<T>(init: RequestContextInit, fn: () => T): T {
    return this.storage.run(this.normalize(init), fn);
  }

  current(): RequestContextData | undefined {
    const stored = this.storage.getStore();
    if (stored === undefined) {
      return undefined;
    }
    const span = this.tracing.activeIds();
    if (span === undefined) {
      return stored;
    }
    // El span activo trae una traza válida: el aviso sobre el valor recibido ya no aplica.
    const withoutInvalidFlag = Object.fromEntries(
      Object.entries(stored).filter(([key]) => key !== 'traceIdInvalid'),
    ) as RequestContextData;
    return {
      ...withoutInvalidFlag,
      traceId: span.traceId,
      spanId: span.spanId,
    };
  }

  private normalize(init: RequestContextInit): RequestContextData {
    const traceId = TraceContextCodec.normalizeTraceId(init.traceId);
    const spanId = TraceContextCodec.normalizeSpanId(init.spanId);
    const externalTraceId = TraceContextCodec.normalizeTraceId(
      init.externalTraceId,
    );
    return {
      ...(traceId !== undefined && { traceId }),
      ...(traceId === undefined &&
        init.traceId !== undefined && { traceIdInvalid: true as const }),
      ...(spanId !== undefined && { spanId }),
      ...(externalTraceId !== undefined && { externalTraceId }),
      ...(init.tenantId !== undefined && { tenantId: init.tenantId }),
      ...(init.actorId !== undefined && { actorId: init.actorId }),
      ...(init.actorType !== undefined && { actorType: init.actorType }),
      ...(init.userId !== undefined && { userId: init.userId }),
      ...(init.region !== undefined && { region: init.region }),
      debugSampled: init.debugSampled === true,
    };
  }
}
