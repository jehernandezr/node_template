import { z } from 'zod';
import type { CommandDefinition } from './define-command.js';
import { defineCommand } from './define-command.js';
import { defineEvent } from './define-event.js';
import type { TopicDefinition } from './define-messaging.js';
import { defineTopic } from './define-messaging.js';

export interface TopicReferenceSpec {
  /** Name of the owning service's topic. */
  readonly name: string;
  readonly fifo?: boolean;
  /** Types of the topic events this reference names. */
  readonly events: readonly string[];
  readonly description: string;
}

export interface CommandReferenceSpec {
  /** Type of the command the owning service handles. */
  readonly type: string;
  readonly description: string;
}

/**
 * Points by name to a topic of another service. Useful when the contract cannot
 * import the owner because the owner already imports it (two services that
 * subscribe to each other). `contracts-export` checks against the owner's
 * contract that the topic and each type exist. The payload is `unknown`: the
 * message consumer validates with the real event from the owner's contract.
 */
export function defineTopicReference(
  spec: TopicReferenceSpec,
): TopicDefinition {
  return defineTopic({
    name: spec.name,
    fifo: spec.fifo ?? false,
    events: spec.events.map((type) =>
      defineEvent({
        type,
        payload: z.unknown(),
        description: `Reference to the ${type} event of the ${spec.name} topic.`,
      }),
    ),
    description: spec.description,
  });
}

/**
 * Points by type to a command of another service, with the same reason and the same
 * check as `defineTopicReference`.
 */
export function defineCommandReference(
  spec: CommandReferenceSpec,
): CommandDefinition {
  return defineCommand({
    type: spec.type,
    payload: z.unknown(),
    description: spec.description,
  });
}
