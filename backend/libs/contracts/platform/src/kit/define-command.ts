import type { z } from 'zod';
import { MessageKind } from '../enums/message-kind.enum.js';
import {
  defineMessage,
  type MessageDefinition,
  type MessageSpec,
} from './message-definition.js';

/**
 * Command: work request to a specific service. Declared by the service that
 * handles it and arrives at one of its queues; the sender declares it in `sends`.
 */
export type CommandDefinition<P extends z.ZodType = z.ZodType> =
  MessageDefinition<MessageKind.Command, P>;

export type CommandSpec<P extends z.ZodType> = MessageSpec<P>;

/**
 * Declares a command. The type is `service.entity.verb.vN`, with the same
 * format and the same versioning rule as events.
 */
export function defineCommand<P extends z.ZodType>(
  spec: CommandSpec<P>,
): CommandDefinition<P> {
  return defineMessage(
    MessageKind.Command,
    'Command',
    'service.entity.verb.vN',
    spec,
  );
}

/** Payload type of a command. */
export type CommandPayload<C extends CommandDefinition> = z.output<
  C['payload']
>;
