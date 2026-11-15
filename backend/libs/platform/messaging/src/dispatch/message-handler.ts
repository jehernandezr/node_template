import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Atiende un mensaje ya validado. */
export type MessageHandler<T> = (
  data: T,
  envelope: MessageEnvelope<T>,
) => void | Promise<void>;
