import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { currentTraceparent } from '@platform/observability';
import {
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
  type MessageInput,
  type MessageOutput,
} from '../contracts/message-contract.js';
import {
  type MessageEnvelope,
  createEnvelope,
  toWireEnvelope,
} from '../envelope/message-envelope.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import type { OutboundTarget } from '../outbox/outbox.js';
import type { RouteDef } from '../topology/route.js';
import type { Topology } from '../topology/topology.js';
import {
  MAX_SEND_DELAY_MS,
  type PublishOptions,
  type SendOptions,
} from './message-bus.js';

/** Longest `groupId` accepted by SNS and SQS FIFO. */
export const MAX_GROUP_ID_LENGTH = 128;

/** SNS/SQS `MessageGroupId`: 1 to 128 printable ASCII characters, no spaces. */
const GROUP_ID = /^[\x21-\x7E]+$/;

/** A validated message ready for a transport or the outbox. */
export interface OutboundMessage<T = unknown> {
  readonly envelope: MessageEnvelope<T>;
  readonly route: RouteDef;
  readonly target: OutboundTarget;
  readonly groupId?: string;
  /** Only for commands. */
  readonly delayMs?: number;
}

/** Options of {@link OutboundMessageFactory}. */
export interface OutboundMessageFactoryOptions {
  /** Value of the envelope `source` attribute. */
  readonly source: string;
  /** Clock for envelope times. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Id generator for envelopes. Defaults to UUIDv7. */
  readonly ids?: IdGenerator;
  /** Overrides the id generator (kept for the deprecated `InMemoryBus` options). */
  readonly newId?: () => string;
  /** Source of the default `traceparent`. Defaults to `currentTraceparent()`. */
  readonly traceparent?: () => string | undefined;
}

/**
 * Builds the envelope of an event or command after checking everything a
 * transport would reject later: the route and its kind, the payload against
 * the contract, the FIFO group id, the delay and the size limit. Every
 * `MessageBus` adapter (memory, outbox, SNS/SQS) shares it.
 */
export class OutboundMessageFactory {
  private readonly topology: Topology;
  private readonly options: OutboundMessageFactoryOptions;
  private readonly clock: Clock;
  private readonly newId: () => string;
  private readonly traceparent: () => string | undefined;

  constructor(topology: Topology, options: OutboundMessageFactoryOptions) {
    this.topology = topology;
    this.options = options;
    this.clock = options.clock ?? new SystemClock();
    const ids = options.ids ?? new UuidV7IdGenerator();
    this.newId = options.newId ?? (() => ids.next().toString());
    this.traceparent = options.traceparent ?? currentTraceparent;
  }

  /** Validates and builds an event. */
  event<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options: PublishOptions = {},
  ): OutboundMessage<MessageOutput<M>> {
    return this.build(event, data, options, undefined);
  }

  /** Validates and builds a command. */
  command<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options: SendOptions = {},
  ): OutboundMessage<MessageOutput<M>> {
    return this.build(command, data, options, options.delayMs ?? 0);
  }

  private build<M extends MessageDefinition>(
    contract: M,
    data: MessageInput<M>,
    options: PublishOptions,
    delayMs: number | undefined,
  ): OutboundMessage<MessageOutput<M>> {
    const route = this.route(contract);
    const groupId = this.groupId(route, options.groupId);
    if (delayMs !== undefined) this.checkDelay(route, delayMs);

    const parsed = contract.schema.safeParse(data);
    if (!parsed.success) {
      throw new MessagingError(
        MessagingErrorCode.InvalidPayload,
        `invalid payload for "${contract.type}": ${parsed.error.message}`,
      );
    }
    const envelope = toWireEnvelope(
      createEnvelope(
        {
          type: contract.type,
          source: this.options.source,
          data: parsed.data as MessageOutput<M>,
          subject: options.subject,
          traceparent: options.traceparent ?? this.traceparent(),
          tenantId: options.tenantId,
          actorId: options.actorId,
        },
        { clock: this.clock, newId: this.newId },
      ),
    );
    return {
      envelope,
      route,
      target: {
        kind: route.targetKind,
        name: route.target.name,
        fifo: route.fifo,
      },
      ...(groupId === undefined ? {} : { groupId }),
      ...(delayMs === undefined ? {} : { delayMs }),
    };
  }

  private route(contract: MessageDefinition): RouteDef {
    const route = this.topology.routeFor(contract.type);
    if (!route || route.kind !== contract.kind) {
      throw new MessagingError(
        MessagingErrorCode.UnknownRoute,
        `no ${contract.kind} route for type "${contract.type}"`,
      );
    }
    return route;
  }

  private groupId(
    route: RouteDef,
    groupId: string | undefined,
  ): string | undefined {
    if (groupId === undefined) {
      if (route.fifo) {
        throw new MessagingError(
          MessagingErrorCode.InvalidOptions,
          `"${route.type}" goes to the FIFO ${route.targetKind} "${route.target.name}" and needs a groupId`,
        );
      }
      return undefined;
    }
    if (groupId.length > MAX_GROUP_ID_LENGTH || !GROUP_ID.test(groupId)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `groupId must be 1 to ${MAX_GROUP_ID_LENGTH} printable ASCII characters without spaces`,
      );
    }
    return groupId;
  }

  private checkDelay(route: RouteDef, delayMs: number): void {
    if (
      !Number.isFinite(delayMs) ||
      delayMs < 0 ||
      delayMs > MAX_SEND_DELAY_MS
    ) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `delayMs must be between 0 and ${MAX_SEND_DELAY_MS}; longer delays need the scheduler`,
      );
    }
    if (delayMs > 0 && route.fifo) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `FIFO queue "${route.target.name}" does not support per-message delays`,
      );
    }
  }
}
