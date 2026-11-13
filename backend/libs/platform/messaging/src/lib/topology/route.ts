import {
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
  MessageKind,
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
  /**
   * Contract the route was declared with. Topology validation requires one
   * (here or in `ValidateOptions.contracts`), because the outbox relay and the
   * dispatcher validate payloads with it.
   */
  readonly contract: MessageDefinition | null;

  constructor(
    kind: MessageKind,
    type: string,
    target: TopicDef | QueueDef,
    targetKind: TargetKind,
    contract: MessageDefinition | null = null,
  ) {
    this.kind = kind;
    this.type = type;
    this.target = target;
    this.targetKind = targetKind;
    this.contract = contract;
  }

  /** Whether the target is a FIFO topic or queue (it then needs a group id). */
  get fifo(): boolean {
    return 'isFifo' in this.target ? this.target.isFifo : this.target.fifo;
  }
}

function split<M extends MessageDefinition>(
  source: string | M,
): { type: string; contract: M | null } {
  return typeof source === 'string'
    ? { type: source, contract: null }
    : { type: source.type, contract: source };
}

/** Second step of `Route.event(...)`. */
export class EventRouteBuilder {
  private readonly type: string;
  private readonly contract: EventDefinition | null;

  constructor(source: string | EventDefinition) {
    const parts = split(source);
    this.type = parts.type;
    this.contract = parts.contract;
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
  private readonly contract: CommandDefinition | null;

  constructor(source: string | CommandDefinition) {
    const parts = split(source);
    this.type = parts.type;
    this.contract = parts.contract;
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

/**
 * Entry point of the routing DSL. Prefer `Topology.fromContracts`, which
 * builds every route from the `topics` and `queues` of the service contracts.
 */
export class Route {
  /**
   * Starts a route for an event of the contracts kit (`defineEvent`). A bare
   * type string is still accepted, but validation then needs its contract in
   * `ValidateOptions.contracts`.
   */
  static event(source: string | EventDefinition): EventRouteBuilder {
    return new EventRouteBuilder(source);
  }

  /** Starts a route for a command of the contracts kit (`defineCommand`). */
  static command(source: string | CommandDefinition): CommandRouteBuilder {
    return new CommandRouteBuilder(source);
  }
}
