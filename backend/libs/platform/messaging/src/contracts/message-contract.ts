import {
  MessageKind,
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
} from '@contracts/platform';
import type { z } from 'zod';

/**
 * Message contracts are the ones from the `@contracts/platform` kit
 * (`defineEvent` and `defineCommand`). They are re-exported here so that messaging
 * has a single entry point.
 */
export { MessageKind };
export type { CommandDefinition, EventDefinition, MessageDefinition };

/** Payload a contract accepts when publishing or sending (before zod default values). */
export type MessageInput<M extends MessageDefinition> = z.input<M['schema']>;

/** Validated payload a handler receives. */
export type MessageOutput<M extends MessageDefinition> = z.output<M['schema']>;
