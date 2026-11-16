import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Una llamada registrada del manejador. */
export interface HandlerCall {
  readonly data: unknown;
  readonly envelope: MessageEnvelope;
}

/** Comportamiento de un manejador de prueba. */
export interface RecordingMessageHandlerOptions {
  /** Error que lanza cada llamada. */
  readonly error?: unknown;
  /** Promesa que espera la llamada n (1 based) antes de terminar. */
  readonly gates?: readonly Promise<void>[];
}

/** Manejador de prueba que registra sus llamadas. Se pasa a `register` por su propiedad `handle`. */
export class RecordingMessageHandler {
  readonly calls: HandlerCall[] = [];

  constructor(private readonly options: RecordingMessageHandlerOptions = {}) {}

  handle = (data: unknown, envelope: MessageEnvelope): Promise<void> => {
    this.calls.push({ data, envelope });
    if (this.options.error !== undefined) {
      throw this.options.error;
    }
    return this.options.gates?.[this.calls.length - 1] ?? Promise.resolve();
  };
}
