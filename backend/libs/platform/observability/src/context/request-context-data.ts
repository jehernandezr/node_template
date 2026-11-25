import type { ActorType } from './actor-type.enum.js';

/** Current context. Trace ids are always W3C 32/16 hex. */
export interface RequestContextData {
  readonly traceId?: string;
  readonly spanId?: string;
  /** The received `traceId` was not valid and was discarded. The value is never stored. */
  readonly traceIdInvalid?: true;
  readonly externalTraceId?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly actorType?: ActorType;
  readonly userId?: string;
  readonly region?: string;
  readonly debugSampled: boolean;
}
