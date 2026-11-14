import { AsyncLocalStorage } from 'node:async_hooks';
import { isSpanContextValid, trace, TraceFlags } from '@opentelemetry/api';
import { normalizeSpanId, normalizeTraceId } from './trace.js';

/** Quién ejecuta la operación. Lo usan la auditoría (`app.actor_id`) y los logs. */
export enum ActorType {
  User = 'user',
  ServiceAccount = 'service_account',
  ApiKey = 'api_key',
  System = 'system',
}

/** Datos con los que se abre un contexto de petición, mensaje o job. */
export interface RequestContextInit {
  /**
   * `traceId` de la operación: 32 hex o UUIDv7 con guiones. Se normaliza a
   * 32 hex. Si hay un span de OpenTelemetry activo, manda el del span.
   */
  readonly traceId?: string;
  readonly spanId?: string;
  /** Trace id del `traceparent` que mandó un cliente externo (no se continúa su traza). */
  readonly externalTraceId?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly actorType?: ActorType;
  /** Usuario final. Coincide con `actorId` cuando `actorType` es `User`. */
  readonly userId?: string;
  /** Región de residencia del tenant (claim `rgn` del JWT). */
  readonly region?: string;
  /** La petición entró en la muestra de debug (`LOG_SAMPLE_RATE`). */
  readonly debugSampled?: boolean;
}

/** Contexto vigente. Los ids de traza siempre están en 32/16 hex W3C. */
export interface RequestContextData {
  readonly traceId?: string;
  readonly spanId?: string;
  /** El `traceId` recibido no era válido y se descartó. Nunca se guarda el valor. */
  readonly traceIdInvalid?: true;
  readonly externalTraceId?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly actorType?: ActorType;
  readonly userId?: string;
  readonly region?: string;
  readonly debugSampled: boolean;
}

/** Ids del span activo de OpenTelemetry. */
export interface ActiveSpanIds {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}

const storage = new AsyncLocalStorage<RequestContextData>();

/** Ids del span activo, o `undefined` si no hay span válido (SDK apagado o fuera de un span). */
export function activeSpanIds(): ActiveSpanIds | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (spanContext === undefined || !isSpanContextValid(spanContext)) {
    return undefined;
  }
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    sampled:
      (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED,
  };
}

function normalize(init: RequestContextInit): RequestContextData {
  const traceId = normalizeTraceId(init.traceId);
  const spanId = normalizeSpanId(init.spanId);
  const externalTraceId = normalizeTraceId(init.externalTraceId);
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

/**
 * Contexto de negocio de cada petición, mensaje o job: tenant, actor, región,
 * `externalTraceId` y la muestra de debug. Se propaga por las llamadas
 * asíncronas con `AsyncLocalStorage`.
 *
 * Los ids de traza no se duplican: si hay un span de OpenTelemetry activo,
 * `current()` devuelve su `traceId` y su `spanId`. Los valores guardados solo
 * se usan cuando el SDK está apagado o no hay span (por ejemplo, en pruebas).
 */
export class RequestContext {
  /** Abre un contexto. Valida y normaliza los ids una sola vez; nunca lanza por ids malformados. */
  static run<T>(init: RequestContextInit, fn: () => T): T {
    return storage.run(normalize(init), fn);
  }

  static current(): RequestContextData | undefined {
    const stored = storage.getStore();
    if (stored === undefined) {
      return undefined;
    }
    const span = activeSpanIds();
    if (span === undefined) {
      return stored;
    }
    const merged = { ...stored, traceId: span.traceId, spanId: span.spanId };
    // El span activo trae una traza válida: el aviso sobre el valor recibido ya no aplica.
    delete (merged as { traceIdInvalid?: true }).traceIdInvalid;
    return merged;
  }
}
