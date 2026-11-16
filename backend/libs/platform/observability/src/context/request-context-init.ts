import type { ActorType } from './actor-type.enum.js';

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
