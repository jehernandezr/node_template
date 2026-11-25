import type { MessageEnvelope } from '../../envelope/message-envelope.js';

/** Builds test envelopes as object literals, with fixed values that each test can change. */
export class EnvelopeBuilder {
  static readonly TIME = '2026-01-01T00:00:00.000Z';

  /** Valid envelope with id `msg-1`, type `test.event.v1`, source `/test` and empty data. */
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
