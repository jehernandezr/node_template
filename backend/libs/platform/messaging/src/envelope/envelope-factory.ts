import type { Clock, IdGenerator } from '@platform/kernel';
import type { CreateEnvelopeInput } from './create-envelope-input.js';
import type { MessageEnvelope } from './message-envelope.js';

/** Arma sobres CloudEvents 1.0 con el reloj y el generador de ids inyectados. */
export class EnvelopeFactory {
  constructor(
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** Los atributos opcionales sin valor se omiten. */
  create<T>(input: CreateEnvelopeInput<T>): MessageEnvelope<T> {
    return {
      specversion: '1.0',
      id: this.ids.next().toString(),
      type: input.type,
      source: input.source,
      time: this.clock.now().toISOString(),
      datacontenttype: 'application/json',
      data: input.data,
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.traceparent !== undefined
        ? { traceparent: input.traceparent }
        : {}),
      ...(input.tenantId !== undefined ? { tenantid: input.tenantId } : {}),
      ...(input.actorId !== undefined ? { actorid: input.actorId } : {}),
    };
  }
}
