import type { MessageEnvelope } from '../../envelope/message-envelope.js';

/** Arma sobres de prueba como objetos literales, con valores fijos que cada prueba puede cambiar. */
export class EnvelopeBuilder {
  static readonly TIME = '2026-01-01T00:00:00.000Z';

  /** Sobre válido con id `msg-1`, tipo `test.event.v1`, fuente `/test` y datos vacíos. */
  static anEnvelope<T = Record<string, never>>(
    overrides: Partial<MessageEnvelope<T>> = {},
  ): MessageEnvelope<T> {
    return {
      specversion: '1.0',
      id: 'msg-1',
      type: 'test.event.v1',
      source: '/test',
      time: EnvelopeBuilder.TIME,
      datacontenttype: 'application/json',
      data: {} as T,
      ...overrides,
    };
  }
}
