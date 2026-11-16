import type { ActorType } from './actor-type.enum.js';

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
