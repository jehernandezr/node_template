import type { ActorType } from './actor-type.enum.js';

/** Data a request, message or job context is opened with. */
export interface RequestContextInit {
  /**
   * `traceId` of the operation: 32 hex or hyphenated UUIDv7. It is normalized to
   * 32 hex. If there is an active OpenTelemetry span, the span's one wins.
   */
  readonly traceId?: string;
  readonly spanId?: string;
  /** Trace id of the `traceparent` sent by an external client (its trace is not continued). */
  readonly externalTraceId?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly actorType?: ActorType;
  /** End user. Matches `actorId` when `actorType` is `User`. */
  readonly userId?: string;
  /** Residency region of the tenant (JWT `rgn` claim). */
  readonly region?: string;
  /** Whether the request was included in the debug sample (`LOG_SAMPLE_RATE`). */
  readonly debugSampled?: boolean;
}
