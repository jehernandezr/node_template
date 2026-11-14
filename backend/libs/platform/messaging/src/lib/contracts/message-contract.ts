import {
  MessageKind,
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
} from '@contracts/platform';
import type { z } from 'zod';

/**
 * Message contracts are those of the `@contracts/platform` kit (`defineEvent`
 * and `defineCommand`). This module re-exports them so messaging code has a
 * single entry point.
 */
export { MessageKind };
export type { CommandDefinition, EventDefinition, MessageDefinition };

/** Payload a contract accepts when publishing or sending (before zod defaults). */
export type MessageInput<M extends MessageDefinition> = z.input<M['schema']>;

/** Validated payload a handler receives. */
export type MessageOutput<M extends MessageDefinition> = z.output<M['schema']>;
