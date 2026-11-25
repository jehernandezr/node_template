import { ActorType, type RequestContextInit } from '@platform/observability';

/** Context of a request from the given tenant, with the same shape the persistence harness builds. */
export class ProbeRequest {
  static contextFor(tenantId: string): RequestContextInit {
    return {
      tenantId,
      actorId: 'runtime-probe',
      actorType: ActorType.System,
      traceId: '0193f1c2-0000-7000-8000-00000000c0de',
      spanId: '00f067aa0ba902b7',
      debugSampled: false,
    };
  }
}
