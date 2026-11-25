import type { z } from 'zod';
import { MessageKind } from '../enums/message-kind.enum.js';
import {
  defineMessage,
  type MessageDefinition,
  type MessageSpec,
} from './message-definition.js';

/** Event published by a service (CloudEvents): a fact that already happened. */
export type EventDefinition<P extends z.ZodType = z.ZodType> =
  MessageDefinition<MessageKind.Event, P>;

export type EventSpec<P extends z.ZodType> = MessageSpec<P>;

/**
 * Declares an event. The type is `service.entity.fact.vN` and the `.vN` suffix
 * is the payload version. The service publishes it on one of its topics.
 */
export function defineEvent<P extends z.ZodType>(
  spec: EventSpec<P>,
): EventDefinition<P> {
  return defineMessage(
    MessageKind.Event,
    'Event',
    'service.entity.fact.vN',
    spec,
  );
}

/** Payload type of an event. */
export type EventPayload<E extends EventDefinition> = z.output<E['payload']>;
