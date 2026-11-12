import {
  type CommandContract,
  type EventContract,
  MessageKind,
  type MessageContract,
} from '../contracts/message-contract.js';
import type { QueueDef } from './queue-def.js';
import type { TopicDef } from './topic-def.js';

/** Kind of infrastructure a route points to. */
export enum TargetKind {
  Topic = 'topic',
  Queue = 'queue',
}

/** Maps one message type to its target. */
export class RouteDef {
  readonly kind: MessageKind;
  readonly type: string;
  readonly target: TopicDef | QueueDef;
  readonly targetKind: TargetKind;
  /** Contract the route was declared with, when a contract instance was given. */
  readonly contract: MessageContract<unknown> | null;

  constructor(
    kind: MessageKind,
    type: string,
    target: TopicDef | QueueDef,
    targetKind: TargetKind,
    contract: MessageContract<unknown> | null = null,
  ) {
    this.kind = kind;
    this.type = type;
    this.target = target;
    this.targetKind = targetKind;
    this.contract = contract;
  }
}

/** Second step of `Route.event(...)`. */
export class EventRouteBuilder {
  private readonly type: string;
  private readonly contract: MessageContract<unknown> | null;

  constructor(source: string | EventContract<unknown>) {
    if (typeof source === 'string') {
      this.type = source;
      this.contract = null;
    } else {
      this.type = source.type;
      this.contract = source;
    }
  }

  /** Publishes this event type to a topic. */
  to(topic: TopicDef): RouteDef {
    return new RouteDef(
      MessageKind.Event,
      this.type,
      topic,
      TargetKind.Topic,
      this.contract,
    );
  }
}

/** Second step of `Route.command(...)`. */
export class CommandRouteBuilder {
  private readonly type: string;
  private readonly contract: MessageContract<unknown> | null;

  constructor(source: string | CommandContract<unknown>) {
    if (typeof source === 'string') {
      this.type = source;
      this.contract = null;
    } else {
      this.type = source.type;
      this.contract = source;
    }
  }

  /** Sends this command type to a queue. */
  to(queue: QueueDef): RouteDef {
    return new RouteDef(
      MessageKind.Command,
      this.type,
      queue,
      TargetKind.Queue,
      this.contract,
    );
  }
}

/** Entry point of the routing DSL. Accepts a type string or a contract instance. */
export class Route {
  /** Starts a route for an event type or contract. */
  static event(source: string | EventContract<unknown>): EventRouteBuilder {
    return new EventRouteBuilder(source);
  }

  /** Starts a route for a command type or contract. */
  static command(
    source: string | CommandContract<unknown>,
  ): CommandRouteBuilder {
    return new CommandRouteBuilder(source);
  }
}
