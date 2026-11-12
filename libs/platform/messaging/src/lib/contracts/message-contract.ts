import type { z } from 'zod';

/** Whether a message is a fact that happened (event) or a request for work (command). */
export enum MessageKind {
  Event = 'event',
  Command = 'command',
}

/** Typed description of one message type: its name, kind and payload schema. */
export abstract class MessageContract<T> {
  /** Fully qualified message type, e.g. `tasks.task.updated.v1`. */
  abstract readonly type: string;
  abstract readonly kind: MessageKind;
  /** Validates the envelope `data` payload. */
  abstract readonly schema: z.ZodType<T>;
}

/** Contract for a fact that happened. Published to topics. */
export abstract class EventContract<T> extends MessageContract<T> {
  override readonly kind = MessageKind.Event;
}

/** Contract for a request for work. Sent to a specific queue. */
export abstract class CommandContract<T> extends MessageContract<T> {
  override readonly kind = MessageKind.Command;
}
