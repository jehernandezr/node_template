import { ContractDefinitionError } from './contract-definition-error.js';
import type { CommandDefinition } from './define-command.js';
import type { EventDefinition } from './define-event.js';
import type { OperationRetryPolicy } from './define-operation.js';

/**
 * Topic of a service: the broadcast point of its events. Each event of the
 * service is published on exactly one of its topics.
 */
export interface TopicDefinition {
  /** Logical name, `service-...`. Terraform adds the environment prefix. */
  readonly name: string;
  /** Ordered delivery (SNS FIFO). Only FIFO queues can subscribe. */
  readonly fifo: boolean;
  readonly events: readonly EventDefinition[];
  readonly description: string;
}

export interface TopicSpec {
  readonly name: string;
  readonly fifo?: boolean;
  readonly events: readonly EventDefinition[];
  readonly description: string;
}

/** Subscription of a queue to a topic, owned or from another service. */
export interface QueueSubscription {
  readonly topic: TopicDefinition;
  /** Events the queue receives. Empty: all of the topic's events, without a filter. */
  readonly events: readonly EventDefinition[];
}

export interface QueueSubscriptionSpec {
  readonly topic: TopicDefinition;
  /** If omitted, the queue receives all of the topic's events. */
  readonly events?: readonly EventDefinition[];
}

/** Retry policy of a queue: total deliveries and exponential backoff. */
export type QueueRetryPolicy = OperationRetryPolicy;

/** Destination queue for messages that fail all their attempts. */
export interface DeadLetterPolicy {
  /** Times a message is received before it moves to the DLQ. Never fewer than the attempts. */
  readonly maxReceiveCount: number;
  /** Days the DLQ keeps a message, from 1 to 14. */
  readonly retentionDays: number;
}

/**
 * Queue of a service: receives its commands and the events of the topics it
 * subscribes to. The service that owns the contract is its only consumer.
 */
export interface QueueDefinition {
  /** Logical name, `service-...`. The DLQ is named `<name>-dlq`. */
  readonly name: string;
  readonly fifo: boolean;
  readonly visibilityTimeoutSeconds: number;
  readonly retry: QueueRetryPolicy;
  readonly deadLetter: DeadLetterPolicy;
  /** Commands of the service itself that arrive at this queue. */
  readonly commands: readonly CommandDefinition[];
  readonly subscriptions: readonly QueueSubscription[];
  readonly description: string;
}

export interface QueueSpec {
  readonly name: string;
  readonly fifo?: boolean;
  /** Seconds a message stays invisible while it is processed. Defaults to 30. */
  readonly visibilityTimeoutSeconds?: number;
  /** Defaults to 10 attempts, 1 s base and 5 min cap: the window covers several minutes of an outage. */
  readonly retry?: QueueRetryPolicy;
  /**
   * Defaults to `maxReceiveCount` ten times the attempts (up to 1 000) and 14 days of retention. SQS counts every
   * receive, including infrastructure failures and redeliveries of an in-flight message, which the consumer does not
   * count as attempts; the margin keeps the queue from sending them to the DLQ on its own.
   */
  readonly deadLetter?: Partial<DeadLetterPolicy>;
  readonly commands?: readonly CommandDefinition[];
  readonly subscriptions?: readonly QueueSubscriptionSpec[];
  readonly description: string;
}

/** Topic or queue name: lowercase letters, digits and hyphens (SNS and SQS). */
export const MESSAGING_NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

/** Maximum length of the logical name; leaves room for the prefix, `-dlq` and `.fifo`. */
export const MESSAGING_NAME_MAX_LENGTH = 60;

/** Suffix of the dead-letter queue. */
export const DEAD_LETTER_SUFFIX = '-dlq';

/** Default values of a queue; they match those of `@platform/messaging`. */
export const QueueDefaults = {
  visibilityTimeoutSeconds: 30,
  maxVisibilityTimeoutSeconds: 43_200,
  retry: { maxAttempts: 10, baseMs: 1_000, maxMs: 300_000 },
  receivesPerAttempt: 10,
  deadLetterRetentionDays: 14,
  maxDeadLetterRetentionDays: 14,
  maxReceiveCount: 1_000,
} as const;

function checkName(kind: string, name: string): void {
  if (
    !MESSAGING_NAME_PATTERN.test(name) ||
    name.length > MESSAGING_NAME_MAX_LENGTH ||
    name.endsWith(DEAD_LETTER_SUFFIX)
  ) {
    throw new ContractDefinitionError(
      `${kind} ${name}: invalid name (lowercase letters, digits and hyphens, up to ${MESSAGING_NAME_MAX_LENGTH}, without ${DEAD_LETTER_SUFFIX})`,
    );
  }
}

function checkUniqueTypes(
  where: string,
  messages: readonly { readonly type: string }[],
): void {
  const types = messages.map((m) => m.type);
  if (new Set(types).size !== types.length) {
    throw new ContractDefinitionError(`${where}: duplicate messages`);
  }
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Declares a topic with the events published on it. */
export function defineTopic(spec: TopicSpec): TopicDefinition {
  const where = `Topic ${spec.name}`;
  checkName('Topic', spec.name);
  if (!spec.description.trim()) {
    throw new ContractDefinitionError(`${where}: missing description`);
  }
  if (spec.events.length === 0) {
    throw new ContractDefinitionError(`${where}: has no events`);
  }
  checkUniqueTypes(where, spec.events);
  return Object.freeze({
    name: spec.name,
    fifo: spec.fifo ?? false,
    events: Object.freeze([...spec.events]),
    description: spec.description,
  });
}

/** Declares a queue with its commands, subscriptions, retries and DLQ. */
export function defineQueue(spec: QueueSpec): QueueDefinition {
  const where = `Queue ${spec.name}`;
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`${where}: ${reason}`);
  };
  checkName('Queue', spec.name);
  if (!spec.description.trim()) fail('missing description');

  const fifo = spec.fifo ?? false;
  const visibility =
    spec.visibilityTimeoutSeconds ?? QueueDefaults.visibilityTimeoutSeconds;
  if (
    !isPositiveInt(visibility) ||
    visibility > QueueDefaults.maxVisibilityTimeoutSeconds
  ) {
    fail(
      `visibilityTimeoutSeconds must be an integer between 1 and ${QueueDefaults.maxVisibilityTimeoutSeconds}`,
    );
  }

  const retry = spec.retry ?? QueueDefaults.retry;
  if (
    !isPositiveInt(retry.maxAttempts) ||
    !(retry.baseMs > 0) ||
    !(retry.maxMs >= retry.baseMs)
  ) {
    fail(
      'retry requires a positive integer maxAttempts and 0 < baseMs <= maxMs',
    );
  }

  const maxReceiveCount =
    spec.deadLetter?.maxReceiveCount ??
    Math.min(
      retry.maxAttempts * QueueDefaults.receivesPerAttempt,
      QueueDefaults.maxReceiveCount,
    );
  if (
    !isPositiveInt(maxReceiveCount) ||
    maxReceiveCount < retry.maxAttempts ||
    maxReceiveCount > QueueDefaults.maxReceiveCount
  ) {
    fail(
      `deadLetter.maxReceiveCount must be between retry.maxAttempts and ${QueueDefaults.maxReceiveCount}`,
    );
  }
  const retentionDays =
    spec.deadLetter?.retentionDays ?? QueueDefaults.deadLetterRetentionDays;
  if (
    !isPositiveInt(retentionDays) ||
    retentionDays > QueueDefaults.maxDeadLetterRetentionDays
  ) {
    fail(
      `deadLetter.retentionDays must be between 1 and ${QueueDefaults.maxDeadLetterRetentionDays}`,
    );
  }

  const commands = [...(spec.commands ?? [])];
  const subscriptions: QueueSubscription[] = [];
  const topics = new Set<string>();
  for (const subscription of spec.subscriptions ?? []) {
    const { topic } = subscription;
    if (topics.has(topic.name)) fail(`duplicate subscription to ${topic.name}`);
    topics.add(topic.name);
    if (topic.fifo && !fifo) {
      fail(`FIFO topic ${topic.name} only delivers to FIFO queues`);
    }
    const events = [...(subscription.events ?? [])];
    for (const event of events) {
      if (!topic.events.includes(event)) {
        fail(`event ${event.type} is not published on ${topic.name}`);
      }
    }
    checkUniqueTypes(`${where} (${topic.name})`, events);
    subscriptions.push(Object.freeze({ topic, events: Object.freeze(events) }));
  }
  if (commands.length === 0 && subscriptions.length === 0) {
    fail('receives neither commands nor events');
  }
  checkUniqueTypes(where, commands);

  return Object.freeze({
    name: spec.name,
    fifo,
    visibilityTimeoutSeconds: visibility,
    retry: Object.freeze({ ...retry }),
    deadLetter: Object.freeze({ maxReceiveCount, retentionDays }),
    commands: Object.freeze(commands),
    subscriptions: Object.freeze(subscriptions),
    description: spec.description,
  });
}

/** Message types a queue receives: its commands and the subscribed events. */
export function deliveredTypes(queue: QueueDefinition): string[] {
  const types = queue.commands.map((c) => c.type);
  for (const subscription of queue.subscriptions) {
    const events =
      subscription.events.length > 0
        ? subscription.events
        : subscription.topic.events;
    types.push(...events.map((e) => e.type));
  }
  return types;
}
