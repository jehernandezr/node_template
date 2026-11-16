import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { EnvelopeFactory, type MessageEnvelope } from '@platform/messaging';

/** Sobres de prueba con ids distintos en cada instancia, así cada prueba tiene los suyos. */
export class EnvelopeBody {
  private readonly factory = new EnvelopeFactory(
    new FixedClock(),
    new SequentialIdGenerator(),
  );

  envelope(type: string, data: unknown): MessageEnvelope {
    return this.factory.create({ type, source: '/test', data });
  }

  json(type: string, data: unknown): string {
    return JSON.stringify(this.envelope(type, data));
  }
}
