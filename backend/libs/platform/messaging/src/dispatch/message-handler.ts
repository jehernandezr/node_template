import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Handles an already validated message. */
export type MessageHandler<T> = (
  data: T,
  envelope: MessageEnvelope<T>,
) => void | Promise<void>;
