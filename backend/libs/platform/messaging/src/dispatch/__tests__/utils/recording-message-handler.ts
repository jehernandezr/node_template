import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** A recorded call of the handler. */
export interface HandlerCall {
  readonly data: unknown;
  readonly envelope: MessageEnvelope;
}

/** Behavior of a test handler. */
export interface RecordingMessageHandlerOptions {
  /** Error thrown by every call. */
  readonly error?: unknown;
  /** Promise that call n (1 based) awaits before finishing. */
  readonly gates?: readonly Promise<void>[];
}

/** Test handler that records its calls. Passed to `register` through its `handle` property. */
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
