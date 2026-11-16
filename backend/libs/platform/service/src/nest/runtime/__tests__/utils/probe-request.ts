import { ActorType, type RequestContextInit } from '@platform/observability';

/** Contexto de una petición del tenant indicado, con la misma forma que arma el arnés de persistencia. */
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
